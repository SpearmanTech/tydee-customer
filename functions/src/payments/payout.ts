import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import axios from "axios";

export const initiateProPayout = functions.https.onCall(
  { secrets: ["PAYSTACK_SECRET"] },
  async (request) => {
    const { jobId, proId, amount } = request.data;
    const paystackSecret = process.env.PAYSTACK_SECRET;

    // 1. Get the Professional's Paystack Recipient Code from Firestore
    const proSnap = await admin.firestore().collection('professionals').doc(proId).get();
    const proData = proSnap.data();

    if (!proData?.paystackRecipientCode) {
       throw new functions.https.HttpsError('failed-precondition', 'Professional has not set up banking details.');
    }

    try {
      const response = await axios.post(
        'https://api.paystack.co/transfer',
        {
          source: "balance",
          amount: Math.round(amount * 100), // Payout amount in cents
          recipient: proData.paystackRecipientCode,
          reason: `Payout for Job #${jobId}`,
          reference: `payout_${jobId}_${Date.now()}`
        },
        { headers: { Authorization: `Bearer ${paystackSecret}` } }
      );

      return { success: true, transferCode: response.data.data.transfer_code };
    } catch (error) {
      console.error("Payout Error:", error);
      throw new functions.https.HttpsError('internal', 'Transfer initiation failed.');
    }
  }
);