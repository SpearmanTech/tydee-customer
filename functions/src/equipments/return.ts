import * as admin from "firebase-admin";
import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";

export const processReturn = onCall(async (request: CallableRequest) => {
  // 1. Auth Check
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Login required');
  }

 
  const db = admin.firestore();
const { rentalId, conditionStatus, damageNotes, scannedReturnCode } = request.data; // Add scannedReturnCode
  return await db.runTransaction(async (transaction) => {
    const rentalRef = db.collection('rentals').doc(rentalId);
    const rentalDoc = await transaction.get(rentalRef);

    if (!rentalDoc.exists) {
      throw new HttpsError('not-found', 'Rental not found');
    }
    
    const rentalData = rentalDoc.data()!;

    // 2. Permission Check: Only the lister (owner) can confirm a return
    if (rentalData.listerId !== request.auth!.uid) {
      throw new HttpsError('permission-denied', 'Unauthorized: You are not the owner of this item.');
    }
if (rentalData.returnCode !== scannedReturnCode) {
  throw new HttpsError('invalid-argument', 'Invalid Return PIN. Cannot close rental.');
}
    if (rentalData.status !== 'active') {
      throw new HttpsError('failed-precondition', 'This rental is not currently active');
    }

    // 3. Update Status
    transaction.update(rentalRef, {
      status: 'completed',
      returnedAt: admin.firestore.FieldValue.serverTimestamp(),
      returnCondition: conditionStatus, // e.g., 'perfect', 'damaged', 'dirty'
      damageNotes: damageNotes || "",
    });

    // 4. Logic for Security Deposit
    // Note: This logic assumes the amount was stored as 'securityDepositAmount'
    const depositToRefund = rentalData.securityDepositAmount || 0;

    return { 
      success: true, 
      message: 'Return confirmed.',
      refundQueued: conditionStatus === 'perfect' ? depositToRefund : 0
    };
  });
});