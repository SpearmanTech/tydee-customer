import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import * as crypto from "crypto";
import axios from "axios";
import { sendPushNotification } from "../notifications/pushHandler";

export const paystackWebhook = functions.https.onRequest(
  { secrets: ["PAYSTACK_SECRET"] },
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
        
        // CUSTOMER CHARGE SUCCESSFUL -> NOW TRIGGER PRO PAYOUT
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
  }
);

/**
 * Triggered when the customer is successfully charged at job completion.
 * This function immediately initiates the transfer to the Pro.
 */
async function handleSuccessfulChargeAndTriggerPayout(data: any) {
  const { reference, metadata, amount } = data;
  const paystackSecret = process.env.PAYSTACK_SECRET;

  if (metadata?.jobId && metadata?.proId) {
    // 1. Update Job to 'paid'
    await admin.firestore().collection('jobs').doc(metadata.jobId).update({
      status: 'completed',
      paymentStatus: 'paid',
      customerPaymentRef: reference,
      paidAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // 2. Fetch Pro banking details (Recipient Code)
    const proSnap = await admin.firestore().collection('professionals').doc(metadata.proId).get();
    const proData = proSnap.data();

    if (!proData?.paystackRecipientCode) {
      console.error("Pro missing payout details");
      return;
    }

    // 3. Calculate Pro's 85% cut
    const proAmount = Math.round(amount * 0.85);

    // 4. Initiate the Transfer
    try {
      await axios.post(
        'https://api.paystack.co/transfer',
        {
          source: "balance",
          amount: proAmount,
          recipient: proData.paystackRecipientCode,
          reason: `Payout for Tydee Job #${metadata.jobId}`,
          reference: `payout_${metadata.jobId}_${Date.now()}`
        },
        { headers: { Authorization: `Bearer ${paystackSecret}` } }
      );
    } catch (err) {
      console.error("Failed to trigger automated payout:", err);
    }
  }
}


async function handleProPayoutSuccess(data: any) {
  const { reference, transfer_code } = data;
  
  // Find the payout record using the reference
  const payoutQuery = await admin.firestore().collection('payouts')
    .where('reference', '==', reference).limit(1).get();

  if (!payoutQuery.empty) {
    const payoutDoc = payoutQuery.docs[0];
    const { proId, jobId } = payoutDoc.data();

    await payoutDoc.ref.update({
      status: 'completed',
      transferCode: transfer_code,
      completedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await admin.firestore().collection('jobs').doc(jobId).update({
      status: 'finalized',
      payoutStatus: 'disbursed'
    });

    await sendPushNotification(proId, {
      title: "Funds Dispatched! 🇿🇦",
      body: "Your payout has been processed and is on its way to your bank account."
    });
  }
}

/**
 * Handles failed transfers (e.g., incorrect bank details)
 */
async function handleProPayoutFailure(data: any) {
    const { reference, reason } = data;
    const payoutQuery = await admin.firestore().collection('payouts')
      .where('reference', '==', reference).limit(1).get();
  
    if (!payoutQuery.empty) {
      const payoutDoc = payoutQuery.docs[0];
      const { proId } = payoutDoc.data();
  
      await payoutDoc.ref.update({
        status: 'failed',
        failureReason: reason
      });
  
      await sendPushNotification(proId, {
        title: "Payout Issue ⚠️",
        body: "There was an issue sending funds to your bank. Please check your banking details."
      });
    }
}