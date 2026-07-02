import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { HttpsError } from "firebase-functions/v2/https";

export const verifyHandover = functions.https.onCall(async (request) => {
  // 1. Auth Check
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Login required');
  }

  const { rentalId, scannedCode } = request.data;
  const db = admin.firestore();

  const rentalRef = db.collection('rentals').doc(rentalId);
  const rentalDoc = await rentalRef.get();

  if (!rentalDoc.exists) {
    throw new HttpsError('not-found', 'Rental not found');
  }

  const rentalData = rentalDoc.data()!;

  // 2. Permission Check: Only the owner (lister) can verify
  if (rentalData.listerId !== request.auth.uid) {
    throw new HttpsError('permission-denied', 'Unauthorized: You do not own this equipment');
  }

  // 3. Code Validation
  if (rentalData.handoverCode === scannedCode) {
    await rentalRef.update({
      status: 'active',
      pickedUpAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { success: true, message: 'Handover verified. Rental is now active!' };
  } else {
    throw new HttpsError('invalid-argument', 'Invalid QR Code. Please try again.');
  }
});