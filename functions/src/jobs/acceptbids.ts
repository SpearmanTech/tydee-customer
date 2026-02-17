import { HttpsError, onCall } from "firebase-functions/v2/https";
import { db } from "../firebase";

// 1. Define the Bid interface so TS knows the structure inside the array
interface Bid {
  professionalId: string;
  amount: number;
  name: string;
  // add other fields if necessary
}

export const acceptBid = onCall(async (request) => {
  const { auth, data } = request;
  if (!auth) throw new HttpsError("unauthenticated", "Login required");

  const { jobId, professionalId } = data;

  if (!jobId || !professionalId) {
    throw new HttpsError("invalid-argument", "Missing jobId or professionalId");
  }

  const jobRef = db.collection("jobs").doc(jobId);

  await db.runTransaction(async (tx) => {
    const jobSnap = await tx.get(jobRef);
    
    if (!jobSnap.exists) {
      throw new HttpsError("not-found", "Job not found");
    }

    // 2. Capture data and guard against undefined (fixes TS18048)
    const jobData = jobSnap.data();
    if (!jobData) {
      throw new HttpsError("internal", "Job data is empty");
    }

    // 3. Now TS knows jobData is defined and safe to use
    if (jobData.customerId !== auth.uid) {
      throw new HttpsError("permission-denied", "Not your job");
    }

    // 4. Safely access the bids array and type the 'find' parameter (fixes TS7006)
    const bids: Bid[] = jobData.bids || [];
    const selectedBid = bids.find((b: Bid) => b.professionalId === professionalId);

    tx.update(jobRef, {
      status: "assigned",
      assigned_professional_id: professionalId,
      // Provide a fallback for budget to ensure final_price is always a number
      final_price: selectedBid ? selectedBid.amount : (jobData.budget || 0),
      bid_status: "closed"
    });
  });

  return { success: true };
});