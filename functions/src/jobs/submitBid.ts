import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const db = getFirestore();

// Simple helper function for ETA placeholder
// You can expand this later with Google Maps Matrix API
const calculateETA = (proLoc: any, jobLoc: any): number => {
  console.log("Calculating distance between:", proLoc, jobLoc);
  return 30; // Default 30 mins
};

export const submitBid = onCall({ region: "us-central1" }, async (request) => {
  const { auth, data } = request;

  // 1. Basic Authentication Check
  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const professionalId = auth.uid;
  const { jobId, amount } = data;

  if (!jobId || typeof amount !== "number" || amount <= 0) {
    throw new HttpsError("invalid-argument", "Invalid jobId or amount.");
  }
  
  // 2. Fetch Professional Data
  const proSnap = await db.collection("professionals").doc(professionalId).get();
  const proData = proSnap.data();

  if (!proSnap.exists || !proData) {
    throw new HttpsError("failed-precondition", "Professional profile missing.");
  }

  // 3. Ensure Job Exists AND Get Data
  const jobRef = db.collection("jobs").doc(jobId);
  const jobSnap = await jobRef.get();
  
  if (!jobSnap.exists) {
    throw new HttpsError("not-found", "Job not found.");
  }

  const jobData = jobSnap.data(); // NOW jobData is defined for the check below

  // 4. Check for duplicate bids
  if (jobData?.bidders?.includes(professionalId)) {
    throw new HttpsError("already-exists", "You have already placed a bid on this job.");
  }

  // 5. Update the Job Document
  try {
    const bidEntry = {
      professionalId: professionalId,
      amount: amount,
      name: proData.name || "Professional",
      rating: proData.rating || 0,
      profileImage: proData.profileImage || null,
      timestamp: new Date().toISOString(),
      id: professionalId,
      // ETA uses the helper function defined above
      eta: proData.currentETA || calculateETA(proData.location, jobData?.location) || 30,
    };

    await jobRef.update({
      bids: FieldValue.arrayUnion(bidEntry),
      bidders: FieldValue.arrayUnion(professionalId),
      hasBids: true,
      bidCount: FieldValue.increment(1)
    });

    return { success: true };
  } catch (error) {
    console.error("Error submitting bid:", error);
    throw new HttpsError("internal", "Failed to update the job with your bid.");
  }
});