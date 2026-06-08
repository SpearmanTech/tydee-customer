import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import * as crypto from "crypto";
import { sendPushNotification } from "../notifications/pushHandler";

export const paystackWebhook = functions.https.onRequest(
  { secrets: ["EXPO_PAYSTACK_SECRET_KEY"] },
  async (req, res) => {
    const paystackSecret = process.env.EXPO_PAYSTACK_SECRET_KEY || "";
    const signature = req.headers["x-paystack-signature"] as string;

    const hash = crypto
      .createHmac("sha512", paystackSecret)
      .update(JSON.stringify(req.body))
      .digest("hex");

    if (hash !== signature) {
      res.status(401).send("Invalid signature");
      return;
    }

    const event = req.body;

    try {
      switch (event.event) {
        case "charge.success":
          await handleSuccessfulPayment(event.data);
          break;

        case "transfer.success":
          await handleSuccessfulTransfer(event.data);
          break;

        case "transfer.failed":
          await handleFailedTransfer(event.data);
          break;

        default:
          console.log("Unhandled event type:", event.event);
      }

      res.status(200).send("Webhook handled");
    } catch (error) {
      console.error("Webhook Processing Error:", error);
      res.status(500).send("Internal Server Error");
    }
  }
);

async function handleSuccessfulPayment(data: any) {
  const { reference, metadata } = data;
  
  if (metadata?.job_id) {
    await admin.firestore().collection('jobs').doc(metadata.job_id).update({
      paymentStatus: 'paid',
      paystackReference: reference,
      paidAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`Job ${metadata.job_id} marked as paid.`);
  }
}

async function handleSuccessfulTransfer(data: any) {
  const { reference, amount, transfer_code } = data;

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

    // We use jobId here to solve the TS6133 "unused variable" error
    await sendPushNotification(proId, {
      title: "Funds Dispatched! 🇿🇦",
      body: `Your payout of R${(amount / 100).toFixed(2)} for Job #${jobId} has been sent.`,
      data: { jobId }
    });
  }
}

async function handleFailedTransfer(data: any) {
  const { reference, reason } = data;
  
  const payoutQuery = await admin.firestore().collection('payouts')
    .where('reference', '==', reference).limit(1).get();

  if (!payoutQuery.empty) {
    const payoutDoc = payoutQuery.docs[0];
    const { proId } = payoutDoc.data();

    await payoutDoc.ref.update({
      status: 'failed',
      failureReason: reason,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await sendPushNotification(proId, {
      title: "Payout Failed ⚠️",
      body: `Issue with your payout: ${reason}. Please check your bank details.`
    });
  }
}