import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import axios from "axios";

export const createProRecipient = functions.https.onCall(
  { secrets: ["PAYSTACK_SECRET"] },
  async (request) => {
    const { accountName, accountNumber, bankCode } = request.data;
    const userId = request.auth?.uid;
    const paystackSecret = process.env.PAYSTACK_SECRET;

    if (!userId) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
    }

    try {
      // 1. Create the Recipient on Paystack
      const response = await axios.post(
        'https://api.paystack.co/transferrecipient',
        {
          type: "nuban",
          name: accountName,
          account_number: accountNumber,
          bank_code: bankCode,
          currency: "ZAR"
        },
        { headers: { Authorization: `Bearer ${paystackSecret}` } }
      );

      const recipientCode = response.data.data.recipient_code;

      // 2. Save the code to the professional's profile in Firestore
      await admin.firestore().collection('professionals').doc(userId).update({
        paystackRecipientCode: recipientCode,
        bankDetailsProvided: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return { success: true, recipientCode };
    } catch (error) {
      console.error("Recipient Creation Error:", error);
      throw new functions.https.HttpsError('internal', 'Failed to link bank account.');
    }
  }
);