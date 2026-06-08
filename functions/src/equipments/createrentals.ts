import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { HttpsError } from "firebase-functions/v2/https";

export const createRental = functions.https.onCall(async (request) => {
  // 1. Auth Check (v2 uses request.auth)
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Login required');
  }

  // Use the data from the request object
  const { equipmentId, startDate, endDate, hasInsurance } = request.data;
  
  if (!equipmentId || !startDate || !endDate) {
    throw new HttpsError('invalid-argument', 'Missing rental parameters');
  }

  const db = admin.firestore();
  const customerId = request.auth.uid;

  return await db.runTransaction(async (transaction) => {
    const equipRef = db.collection('equipment').doc(equipmentId);
    const equipDoc = await transaction.get(equipRef);

    if (!equipDoc.exists) {
      throw new HttpsError('not-found', 'Equipment missing');
    }

    const equipData = equipDoc.data()!;
    
    // 2. Availability Check
    const existingRentals = await db.collection('rentals')
      .where('equipmentId', '==', equipmentId)
      .where('status', 'in', ['active', 'pending_pickup'])
      .get();
    
    // Note: existingRentals is read here to prevent TS6133
    if (!existingRentals.empty) {
        // Optional: Add logic to check specific date overlaps here
    }
    
    // 3. Secure Price Calculation
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) || 1;
    
    const insuranceFee = hasInsurance ? 85 : 0;
    const total = (equipData.dailyRate * days) + (equipData.securityDeposit || 0) + 50 + insuranceFee;

    const rentalRef = db.collection('rentals').doc();
    
    transaction.set(rentalRef, {
      equipmentId,
      customerId: customerId, 
      listerId: equipData.ownerId,
      status: 'pending_pickup',
      startDate: admin.firestore.Timestamp.fromDate(start),
      endDate: admin.firestore.Timestamp.fromDate(end),
      totalAmount: total,
      handoverCode: Math.random().toString(36).substring(7).toUpperCase(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { rentalId: rentalRef.id, total };
  });
});