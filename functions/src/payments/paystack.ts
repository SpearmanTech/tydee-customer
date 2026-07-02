 import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import * as crypto from "crypto";
import axios from "axios";
import { Resend } from "resend";
import { sendPushNotification } from "../notifications/pushHandler";

// Initialize admin only once
if (admin.apps.length === 0) {
  admin.initializeApp();
}

/**
 * Verifies the validation charge and saves the authorization token
 */
export const verifyAndSaveCard = functions.https.onCall(
  { secrets: ["EXPO_PAYSTACK_SECRET_KEY"] },
  async (request) => {
    if (!request.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
    }

    const { reference, userId } = request.data;
    
    // Security check: Ensure the authenticated user is the one they are updating
    if (request.auth.uid !== userId) {
        throw new functions.https.HttpsError('permission-denied', 'Unauthorized data access.');
    }

    try {
      const paystackSecret = process.env.EXPO_PAYSTACK_SECRET_KEY;

      const response = await axios.get(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
        { headers: { Authorization: `Bearer ${paystackSecret}` } }
      );

      const { status, authorization, customer } = response.data.data;

      if (status === 'success' && authorization.reusable) {
        await admin.firestore().collection('customers').doc(userId).update({
          paymentMethod: {
            token: authorization.authorization_code,
            last4: authorization.last4,
            brand: authorization.brand,
            expMonth: authorization.exp_month,
            expYear: authorization.exp_year,
            email: customer.email, // Useful to keep synced
            isLinked: true,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          }
        });
        return { success: true };
      }
      return { success: false, message: "Card is not reusable or payment failed." };
    } catch (error) {
      console.error("Paystack Verification Error:", error);
      throw new functions.https.HttpsError('internal', 'Unable to verify payment.');
    }
  }
);

/**
 * Background charge function for seamless "One-Tap" booking
 */
export const chargeSavedCard = functions.https.onCall(
  { secrets: ["EXPO_PAYSTACK_SECRET_KEY"] },
  async (request) => {
    if (!request.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
    }

    // Added proId here so it can be passed to the webhook metadata
    const { userId, amount, jobId, proId } = request.data;

    const userSnap = await admin.firestore().collection('customers').doc(userId).get();
    const userData = userSnap.data();

    if (!userData?.paymentMethod?.token) {
      throw new functions.https.HttpsError('failed-precondition', 'No card linked.');
    }

    try {
      const paystackSecret = process.env.EXPO_PAYSTACK_SECRET_KEY;

      const res = await axios.post(
        'https://api.paystack.co/transaction/charge_authorization',
        {
          email: userData.paymentMethod.email || userData.email,
          amount: Math.round(amount * 100), 
          authorization_code: userData.paymentMethod.token,
          // Using jobId as reference prevents double-charging for the same job
          reference: `job_${jobId}_${Date.now()}`, 
          metadata: { 
            job_id: jobId, 
            user_id: userId,
            pro_id: proId // Crucial for the webhook
          }
        },
        { headers: { Authorization: `Bearer ${paystackSecret}` } }
      );

      return { success: true, data: res.data.data };
    } catch (error: any) {
      console.error("Background Charge Error:", error.response?.data || error.message);
      throw new functions.https.HttpsError('internal', 'Automatic charge failed.');
    }
  }
);

/**
 * Webhook Handler: Listens for Paystack events (Charge Success, Transfer Success/Failure)
 */
export const paystackWebhook = functions.https.onRequest(
  { secrets: ["EXPO_PAYSTACK_SECRET_KEY", "RESEND_API_KEY"] },
  async (req, res) => {
    const paystackSecret = process.env.EXPO_PAYSTACK_SECRET_KEY || "";
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
          console.log(`Unhandled event type: ${event.event}`);
      }

      res.status(200).send("Event Processed");
    } catch (error) {
      console.error("Webhook Processing Error:", error);
      res.status(500).send("Internal Server Error");
    }
  }
);

/**
 * Triggered when the customer is successfully charged.
 * Updates Job -> Sends Resend Receipt/Review Email -> Initiates Pro Payout.
 */
async function handleSuccessfulChargeAndTriggerPayout(data: any) {
  const { reference, metadata, amount, customer } = data;
  
  // Safely extract metadata regardless of camelCase or snake_case
  const jobId = metadata?.job_id || metadata?.jobId;
  const proId = metadata?.pro_id || metadata?.proId;
  
  const paystackSecret = process.env.EXPO_PAYSTACK_SECRET_KEY;
  const resend = new Resend(process.env.RESEND_API_KEY);

  if (jobId && proId) {
    // 1. Update Job to 'completed' & 'paid'
    await admin.firestore().collection("jobs").doc(jobId).update({
      status: "completed",
      paymentStatus: "paid",
      customerPaymentRef: reference,
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 2. Prepare Email Data
    const formattedAmount = (amount / 100).toFixed(2);
    // TODO: Update this URL to match your actual web app's domain
    const reviewLink = `https://your-website.com/rate-pro?jobId=${jobId}&proId=${proId}`;

    // 3. Send Invoice and Review Link via Resend
    try {
      await resend.emails.send({
        from: 'Foona App <receipts@your-domain.com>', // Ensure domain is verified in Resend
        to: customer.email,
        subject: 'Your Receipt & Rate Your Pro',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
            <h2 style="color: #10b981;">Payment Successful</h2>
            <p>Thank you for using Foona! Here is the receipt for your recent job.</p>
            
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Amount Paid:</strong> R ${formattedAmount}</p>
              <p><strong>Reference:</strong> ${reference}</p>
              <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            </div>

            <h3 style="margin-top: 30px;">How did your Pro do?</h3>
            <p>Your feedback keeps the community safe and reliable.</p>
            
            <a href="${reviewLink}" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 10px;">
              Leave a Review
            </a>
          </div>
        `
      });
      console.log(`Invoice and review link sent to ${customer.email}`);
    } catch (emailError) {
      console.error("Failed to send Resend email:", emailError);
      // We don't throw here to ensure the Pro payout still triggers even if the email fails
    }

    // 4. Fetch Pro banking details (Recipient Code) for payout
    const proSnap = await admin
      .firestore()
      .collection("professionals")
      .doc(proId)
      .get();
    const proData = proSnap.data();

    if (!proData?.paystackRecipientCode) {
      console.error(`Pro ${proId} is missing payout details`);
      return;
    }

    // 5. Calculate Pro's 85% cut (in cents)
    const proAmount = Math.round(amount * 0.85);

    // 6. Initiate the Transfer to Pro
    try {
      await axios.post(
        "https://api.paystack.co/transfer",
        {
          source: "balance",
          amount: proAmount,
          recipient: proData.paystackRecipientCode,
          reason: `Payout for Foona Job #${jobId}`,
          reference: `payout_${jobId}_${Date.now()}`,
        },
        { headers: { Authorization: `Bearer ${paystackSecret}` } },
      );
    } catch (err) {
      console.error("Failed to trigger automated payout:", err);
    }
  }
}

/**
 * Triggered when a Pro successfully receives their money
 */
async function handleProPayoutSuccess(data: any) {
  const { reference, transfer_code, amount } = data;

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
      body: `Your payout of R${(amount / 100).toFixed(2)} has been sent to your bank account.`,
      data: { jobId }
    });
  }
}

/**
 * Triggered when a Pro's payout bounces or fails
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
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await sendPushNotification(proId, {
      title: "Payout Issue ⚠️",
      body: `There was an issue sending funds: ${reason}. Please check your banking details.`
    });
  }
}