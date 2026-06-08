import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import axios from "axios";

export const completeJobAndCharge = functions.https.onCall(
  { secrets: ["PAYSTACK_SECRET"] },
  async (request) => {
    const { jobId } = request.data;
    const paystackSecret = process.env.PAYSTACK_SECRET;

    // 1. Fetch the job details
    const jobRef = admin.firestore().collection('jobs').doc(jobId);
    const jobSnap = await jobRef.get();
    const jobData = jobSnap.data();

    if (!jobData || jobData.status !== 'active') {
      throw new functions.https.HttpsError('failed-precondition', 'Job is not in a state that can be charged.');
    }

    // 2. Get customer's authorization token (saved during onboarding)
    const customerSnap = await admin.firestore().collection('customers').doc(jobData.customerId).get();
    const customerData = customerSnap.data();

    if (!customerData?.paymentMethod?.authorization_code) {
      throw new functions.https.HttpsError('not-found', 'Customer has no linked payment method.');
    }

    try {
      // 3. Trigger the Paystack Charge
      const response = await axios.post(
        'https://api.paystack.co/transaction/charge_authorization',
        {
          email: customerData.email,
          amount: Math.round(jobData.accepted_bid_details.amount * 100), // In cents
          authorization_code: customerData.paymentMethod.authorization_code,
          metadata: {
            jobId: jobId,
            proId: jobData.accepted_bid_details.proId,
            type: 'job_completion_charge'
          }
        },
        { headers: { Authorization: `Bearer ${paystackSecret}` } }
      );

      // 4. Update job to pending_payout (Webhook will handle the rest)
      await jobRef.update({
        status: 'pending_payout',
        completionInitiatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return { success: true, reference: response.data.data.reference };
    } catch (error) {
      console.error("Charge Error:", error);
      throw new functions.https.HttpsError('internal', 'Failed to charge customer card.');
    }
  }
);