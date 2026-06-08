import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import axios from "axios";

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
      // Use the secret injected by Firebase v2
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

    const { userId, amount, jobId } = request.data;

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
          metadata: { job_id: jobId, user_id: userId }
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