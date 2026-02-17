import {getFirestore} from "firebase-admin/firestore";
import {HttpsError, onCall} from "firebase-functions/v2/https";

export const getAvailableJobs = onCall(
  {region: "us-central1"},
  async (request) => {
    const uid = request.auth?.uid;

    if (!uid) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    // Standard logging for Cloud Functions (viewable in Firebase Console)
    console.log(`Professional ${uid} is requesting available jobs.`);

    const db = getFirestore();

    const snapshot = await db
  .collection("jobs")
  .where("status", "in", ["open", "pending"]) // Finds both
  .where("bid_status", "==", "open")
  .orderBy("createdAt", "desc")
  .limit(50)
  .get();

    const jobs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return {jobs};
  }
);
