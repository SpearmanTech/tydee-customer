import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import * as crypto from "crypto";
import axios from "axios";
import { sendPushNotification } from "../notifications/pushHandler";
import { Resend } from "resend";
import PDFDocument from "pdfkit";

export const paystackWebhook = functions.https.onRequest(
  { secrets: ["PAYSTACK_SECRET", "RESEND_API_KEY"] }, // ADDED RESEND SECRET
  async (req, res) => {
    const paystackSecret = process.env.PAYSTACK_SECRET || "";
    const signature = req.headers["x-paystack-signature"] as string;

    const hash = crypto
      .createHmac("sha512", paystackSecret)
      .update(JSON.stringify(req.body))
      .digest("hex");

    if (hash !== signature) {
      res.status(401).send("Unauthorized");
      return;
    }

    const event = req.body;
    const data = event.data;

    try {
      switch (event.event) {
        // CUSTOMER CHARGE SUCCESSFUL -> TRIGGER PAYOUT & SEND RECEIPT
        case "charge.success":
          await handleSuccessfulChargeAndTriggerPayout(data);
          break;

        case "transfer.success":
          await handleProPayoutSuccess(data);
          break;

        case "transfer.failed":
          await handleProPayoutFailure(data);
          break;

        default:
          console.log(`Unhandled event: ${event.event}`);
      }

      res.status(200).send("Event Processed");
    } catch (error) {
      console.error("Webhook Error:", error);
      res.status(500).send("Internal Error");
    }
  },
);

/**
 * Triggered when the customer is successfully charged at job completion.
 * This initiates the transfer to the Pro, generates the PDF, and sends the rating email.
 */
async function handleSuccessfulChargeAndTriggerPayout(data: any) {
  const { reference, metadata, amount } = data;
  const paystackSecret = process.env.PAYSTACK_SECRET;
  const resendApiKey = process.env.RESEND_API_KEY;

  if (metadata?.jobId && metadata?.proId) {
    const db = admin.firestore();

    // 1. Update Job to 'completed' & 'success' (Unlocks customer UI)
    await db.collection("jobs").doc(metadata.jobId).update({
      status: "completed",
      paymentStatus: "success", // Changed from 'paid' to 'success' to match your frontend listener
      customerPaymentRef: reference,
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 2. Fetch Job, Pro, and Customer Details
    const jobSnap = await db.collection("jobs").doc(metadata.jobId).get();
    const jobData = jobSnap.data();

    const proSnap = await db.collection("professionals").doc(metadata.proId).get();
    const proData = proSnap.data();

    const customerSnap = await db.collection("customers").doc(jobData?.customerId).get();
    const customerData = customerSnap.data();

    // 3. TRIGGER PAYOUT TO PRO
    if (!proData?.paystackRecipientCode) {
      console.error("Pro missing payout details");
    } else {
      // Calculate Pro's 85% cut
      const proAmount = Math.round(amount * 0.85);

      try {
        await axios.post(
          "https://api.paystack.co/transfer",
          {
            source: "balance",
            amount: proAmount,
            recipient: proData.paystackRecipientCode,
            reason: `Payout for Foona Job #${metadata.jobId}`,
            reference: `payout_${metadata.jobId}_${Date.now()}`,
          },
          { headers: { Authorization: `Bearer ${paystackSecret}` } },
        );
      } catch (err) {
        console.error("Failed to trigger automated payout:", err);
      }
    }

    // 4. GENERATE PDF & SEND RESEND EMAIL TO CUSTOMER
    if (customerData?.email && resendApiKey) {
      try {
        const resend = new Resend(resendApiKey);

        // A. Generate PDF Buffer
        const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
          const doc = new PDFDocument({ margin: 50 });
          const buffers: Buffer[] = [];
          doc.on("data", buffers.push.bind(buffers));
          doc.on("end", () => resolve(Buffer.concat(buffers)));
          doc.on("error", reject);

          doc.fontSize(24).text("FOONA INVOICE", { align: "center" }).moveDown();
          doc.fontSize(12).text(`Invoice ID: INV-${metadata.jobId.substring(0, 8).toUpperCase()}`);
          doc.text(`Date: new Date().toLocaleDateString()`).moveDown();
          doc.text(`Billed To: ${customerData.displayName || customerData.email}`);
          doc.text(`Service Provider: ${proData?.displayName || "Foona Pro"}`).moveDown(2);

          doc.fontSize(14).text("Service Details", { underline: true }).moveDown(0.5);
          doc.fontSize(12).text(`${jobData?.title || "Professional Service"}`);
          doc.moveDown();
          doc.fontSize(16).text(`Total Paid: R ${(amount / 100).toFixed(2)}`, { align: "right" });

          doc.end();
        });

        // B. Construct HTML with Magic Rating Links
        const baseUrl = "https://app.foona.co.za/jobs/rate";
        const htmlBody = `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
            <h2 style="color: #10b981;">Payment Successful!</h2>
            <p>Hi ${customerData.displayName || 'there'},</p>
            <p>Your payment of <strong>R ${(amount / 100).toFixed(2)}</strong> has been processed successfully. Your official invoice is attached to this email.</p>
            
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; text-align: center; margin-top: 30px;">
              <h3 style="margin-top: 0;">How was your service?</h3>
              <p style="color: #64748b; margin-bottom: 20px;">Tap a star to rate ${proData?.displayName || 'your Pro'} instantly.</p>
              
              <div style="font-size: 36px; display: flex; justify-content: center; gap: 10px;">
                <a href="${baseUrl}/${metadata.jobId}?stars=1" style="text-decoration: none;">⭐</a>
                <a href="${baseUrl}/${metadata.jobId}?stars=2" style="text-decoration: none;">⭐</a>
                <a href="${baseUrl}/${metadata.jobId}?stars=3" style="text-decoration: none;">⭐</a>
                <a href="${baseUrl}/${metadata.jobId}?stars=4" style="text-decoration: none;">⭐</a>
                <a href="${baseUrl}/${metadata.jobId}?stars=5" style="text-decoration: none;">⭐</a>
              </div>
            </div>
          </div>
        `;

        // C. Dispatch Email
        await resend.emails.send({
          from: "Foona <billing@foona.co.za>", // Ensure this domain is verified in Resend
          to: customerData.email,
          subject: "Your Foona Invoice & Receipt",
          html: htmlBody,
          attachments: [
            {
              filename: `Foona_Invoice_${metadata.jobId.substring(0, 8)}.pdf`,
              content: pdfBuffer,
            },
          ],
        });

      } catch (err) {
        console.error("Failed to generate PDF or send email:", err);
      }
    }
  }
}

async function handleProPayoutSuccess(data: any) {
  const { reference, transfer_code } = data;

  // Find the payout record using the reference
  const payoutQuery = await admin
    .firestore()
    .collection("payouts")
    .where("reference", "==", reference)
    .limit(1)
    .get();

  if (!payoutQuery.empty) {
    const payoutDoc = payoutQuery.docs[0];
    const { proId, jobId } = payoutDoc.data();

    await payoutDoc.ref.update({
      status: "completed",
      transferCode: transfer_code,
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await admin.firestore().collection("jobs").doc(jobId).update({
      status: "finalized",
      payoutStatus: "disbursed",
    });

    await sendPushNotification(proId, {
      title: "Funds Dispatched! 🇿🇦",
      body: "Your payout has been processed and is on its way to your bank account.",
    });
  }
}

/**
 * Handles failed transfers (e.g., incorrect bank details)
 */
async function handleProPayoutFailure(data: any) {
  const { reference, reason } = data;
  const payoutQuery = await admin
    .firestore()
    .collection("payouts")
    .where("reference", "==", reference)
    .limit(1)
    .get();

  if (!payoutQuery.empty) {
    const payoutDoc = payoutQuery.docs[0];
    const { proId } = payoutDoc.data();

    await payoutDoc.ref.update({
      status: "failed",
      failureReason: reason,
    });

    await sendPushNotification(proId, {
      title: "Payout Issue ⚠️",
      body: "There was an issue sending funds to your bank. Please check your banking details.",
    });
  }
}