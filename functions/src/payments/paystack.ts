import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import axios from "axios";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET || "";

/**
 * Verifies the R1.00 validation charge and saves the authorization token
 */
export const verifyAndSaveCard = functions.https.onCall(
  { secrets: ["PAYSTACK_SECRET"] },
  async (request) => {
    // 1. Check Auth (v2 uses request.auth)
    if (!request.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
    }

    // 2. Extract Data (v2 uses request.data)
    const { reference, userId } = request.data;

    try {
      const response = await axios.get(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
        { headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` } }
      );

      const { status, authorization } = response.data.data;

      if (status === 'success' && authorization.reusable) {
        // Updated to use 'customers' collection to match your app's structure
        await admin.firestore().collection('customers').doc(userId).update({
          paymentMethod: {
            token: authorization.authorization_code,
            last4: authorization.last4,
            brand: authorization.brand,
            isLinked: true,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          }
        });
        return { success: true };
      }
      return { success: false, message: "Card is not reusable or payment failed." };
    } catch (error) {
      console.error("Paystack Verification Error:", error);
      throw new functions.https.HttpsError('internal', 'Unable to verify payment with Paystack.');
    }
  }
);

/**
 * Background charge function for seamless "One-Tap" booking
 */
export const chargeSavedCard = functions.https.onCall(
  { secrets: ["PAYSTACK_SECRET"] },
  async (request) => {
    // Check Auth
    if (!request.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
    }

    const { userId, amount, jobId } = request.data;

    const userSnap = await admin.firestore().collection('customers').doc(userId).get();
    const userData = userSnap.data();

    if (!userData?.paymentMethod?.token) {
      throw new functions.https.HttpsError('failed-precondition', 'No card linked for this user.');
    }

    try {
      const res = await axios.post(
        'https://api.paystack.co/transaction/charge_authorization',
        {
          email: userData.email,
          amount: amount * 100, // Paystack amounts are in cents
          authorization_code: userData.paymentMethod.token,
          metadata: { job_id: jobId }
        },
        { headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` } }
      );

      return res.data;
    } catch (error) {
      console.error("Background Charge Error:", error);
      throw new functions.https.HttpsError('internal', 'Automatic charge failed.');
    }
  }
);