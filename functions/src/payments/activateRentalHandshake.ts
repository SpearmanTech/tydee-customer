import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import axios from "axios";

// Helper function to generate a random 4 digit PIN
const generatePin = () => Math.floor(1000 + Math.random() * 9000).toString();

export const createRentalAndCharge = functions.https.onCall(
  { secrets: ["EXPO_PAYSTACK_SECRET_KEY"] },
  async (request) => {
    if (!request.auth) throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');

    const {
      equipmentId, ownerId, userId, days, startDate, endDate,
      hasInsurance, totalAmount, securityDeposit, dueNow, rentalFee
    } = request.data;

    if (request.auth.uid !== userId) throw new functions.https.HttpsError('permission-denied', 'Unauthorized access.');

    try {
      const db = admin.firestore();

      const equipmentSnap = await db.collection('equipment').doc(equipmentId).get();
      if (!equipmentSnap.exists) throw new functions.https.HttpsError('not-found', 'Equipment no longer exists.');

      const customerSnap = await db.collection('customers').doc(userId).get();
      const customerData = customerSnap.data();

      if (!customerData?.paymentMethod?.token) {
        throw new functions.https.HttpsError('failed-precondition', 'No valid payment method linked.');
      }

      // 1. Charge ONLY the Upfront Due Now Amount (Escrow/Deposit)
      const paystackSecret = process.env.EXPO_PAYSTACK_SECRET_KEY;
      const chargeResponse = await axios.post(
        'https://api.paystack.co/transaction/charge_authorization',
        {
          email: customerData.paymentMethod.email || customerData.email,
          amount: Math.round(dueNow * 100), // Convert ZAR to cents
          authorization_code: customerData.paymentMethod.token,
          reference: `rental_escrow_${equipmentId}_${Date.now()}`,
          metadata: { rental_type: 'equipment_escrow', user_id: userId, owner_id: ownerId }
        },
        { headers: { Authorization: `Bearer ${paystackSecret}` } }
      );

      if (chargeResponse.data.data.status !== 'success') {
         throw new Error("Paystack deposit charge was not successful");
      }

      // 2. Generate the Handshake PIN
      const startPin = generatePin();

      // 3. Create the Rental Document
      const rentalRef = db.collection('rentals').doc();
      await rentalRef.set({
        id: rentalRef.id,
        equipmentId,
        equipmentTitle: equipmentSnap.data()?.title || 'Premium Gear',
        ownerId,
        userId,
        days,
        startDate,
        endDate,
        hasInsurance,
        dueNow,
        rentalFee,      // We save this to know exactly what to charge at handshake
        securityDeposit,
        totalAmount,
        status: 'pending_transfer', // Wait for the handshake!
        startPin,                   // The secret PIN the owner needs
        escrowReference: chargeResponse.data.data.reference,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        metadata: { location: equipmentSnap.data()?.locationString || "Durban Metro" }
      });

      return { success: true, rentalId: rentalRef.id };
    } catch (error: any) {
      console.error("Rental Deposit Error:", error.response?.data || error.message);
      throw new functions.https.HttpsError('internal', 'Deposit payment failed. Your card was not charged.');
    }
  }
);


// 🚀 NEW FUNCTION: Handshake & Rental Charge
export const activateRentalHandshake = functions.https.onCall(
  { secrets: ["EXPO_PAYSTACK_SECRET_KEY"] },
  async (request) => {
    if (!request.auth) throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');

    const { rentalId, enteredPin } = request.data;
    const db = admin.firestore();

    try {
      const rentalRef = db.collection('rentals').doc(rentalId);
      const rentalSnap = await rentalRef.get();
      const rentalData = rentalSnap.data();

      if (!rentalData || rentalData.status !== 'pending_transfer') {
        throw new functions.https.HttpsError('failed-precondition', 'Rental is not pending a transfer.');
      }

      // Security check: Only the OWNER of the equipment can verify the PIN
      if (request.auth.uid !== rentalData.ownerId) {
        throw new functions.https.HttpsError('permission-denied', 'Only the owner can activate this rental.');
      }

      // 1. Verify PIN
      if (rentalData.startPin !== enteredPin) {
        return { success: false, message: "Invalid PIN code." };
      }

      // 2. Fetch Customer's Wallet Data again to charge the Rental Fee
      const customerSnap = await db.collection('customers').doc(rentalData.userId).get();
      const customerData = customerSnap.data();

      // 3. Charge the actual Rental Fee
      const paystackSecret = process.env.EXPO_PAYSTACK_SECRET_KEY;
      const chargeResponse = await axios.post(
        'https://api.paystack.co/transaction/charge_authorization',
        {
          email: customerData?.paymentMethod?.email || customerData?.email,
          amount: Math.round(rentalData.rentalFee * 100), // Charge the daily rent
          authorization_code: customerData?.paymentMethod?.token,
          reference: `rental_fee_${rentalId}_${Date.now()}`,
          metadata: { type: 'rental_activation', rental_id: rentalId }
        },
        { headers: { Authorization: `Bearer ${paystackSecret}` } }
      );

      if (chargeResponse.data.data.status !== 'success') {
         throw new Error("Paystack rental charge was not successful");
      }

      // 4. Update the Rental Document to Active
      await rentalRef.update({
        status: 'active',
        rentalChargeReference: chargeResponse.data.data.reference,
        activatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return { success: true };
    } catch (error: any) {
      console.error("Handshake Charge Error:", error.response?.data || error.message);
      throw new functions.https.HttpsError('internal', 'Failed to process rental fee charge.');
    }
  }
);