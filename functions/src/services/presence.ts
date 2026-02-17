import * as admin from "firebase-admin";
const db = admin.firestore();

/**
 * Mark professional as online
 */
export async function setProfessionalOnline(uid: string) {
  await db.collection("professionals").doc(uid).update({
    online: true,
    lastSeenAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

/**
 * Mark professional as offline
 */
export async function setProfessionalOffline(uid: string) {
  await db.collection("professionals").doc(uid).update({
    online: false,
    lastSeenAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}
