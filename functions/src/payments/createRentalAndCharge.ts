import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import axios from "axios";

const generatePin = () => Math.floor(1000 + Math.random() * 9000).toString();

export const createRentalAndCharge = functions.https.onCall(
  { secrets: ["EXPO_PAYSTACK_SECRET_KEY"] },
  async (request) => {
    if (!request.auth) throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');

    const {
      equipmentId, ownerId, userId, renterRole, // 'customer' or 'pro'
      days, startDate, endDate, hasInsurance, 
      totalAmount, securityDeposit, dueNow, rentalFee
    } = request.data;

    try {
      const db = admin.firestore();
      
      // Determine which collection to pull the user's wallet from
      const collectionName = renterRole === 'pro' ? 'professionals' : 'customers';
      const userSnap = await db.collection(collectionName).doc(userId).get();
      const userData = userSnap.data();

      if (!userData?.paymentMethod?.token) {
        throw new functions.https.HttpsError('failed-precondition', 'No valid payment method linked.');
      }

      // DETERMINE CHARGE STRATEGY
      // If Customer: Charge 'dueNow' (Escrow). If Pro: Charge 'totalAmount' (Instant)
      const chargeAmount = renterRole === 'pro' ? totalAmount : dueNow;
      
      const paystackSecret = process.env.EXPO_PAYSTACK_SECRET_KEY;
      const chargeResponse = await axios.post(
        'https://api.paystack.co/transaction/charge_authorization',
        {
          email: userData.paymentMethod.email || userData.email,
          amount: Math.round(chargeAmount * 100), 
          authorization_code: userData.paymentMethod.token,
          reference: `rental_${equipmentId}_${Date.now()}`,
          metadata: { type: 'equipment_rental', user_id: userId }
        },
        { headers: { Authorization: `Bearer ${paystackSecret}` } }
      );

      if (chargeResponse.data.data.status !== 'success') {
         throw new Error("Paystack charge was not successful");
      }

      const rentalRef = db.collection('rentals').doc();
      
      // BASE RENTAL DATA
      const rentalData: any = {
        id: rentalRef.id,
        equipmentId,
        ownerId,
        userId,
        renterRole,
        days,
        startDate,
        endDate,
        hasInsurance,
        totalAmount,
        securityDeposit,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      // APPLY TIERED LOGIC
      if (renterRole === 'customer') {
        rentalData.status = 'pending_transfer';
        rentalData.startPin = generatePin();
        rentalData.dueNow = dueNow;
        rentalData.rentalFee = rentalFee;
        rentalData.escrowReference = chargeResponse.data.data.reference;
      } else {
        // PRO LITE-FLOW
        rentalData.status = 'active'; // Instant approval, no PIN needed
        rentalData.rentalChargeReference = chargeResponse.data.data.reference;
      }

      await rentalRef.set(rentalData);

      return { success: true, rentalId: rentalRef.id };
    } catch (error: any) {
      console.error("Rental Charge Error:", error);
      throw new functions.https.HttpsError('internal', 'Payment failed.');
    }
  }
);