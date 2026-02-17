import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const db = getFirestore();

// --- SUBMIT BID ---
export const submitBid = onCall(
  { region: "us-central1" },
  async (request) => {
    const uid = request.auth?.uid;
    const { jobId, amount } = request.data;

    if (!uid) throw new HttpsError("unauthenticated", "User not authenticated");
    if (!jobId || !amount) throw new HttpsError("invalid-argument", "Missing jobId or amount");

    // 1. Get Professional Profile Data (to show the customer who is bidding)
    const proSnap = await db.collection("professionals").doc(uid).get();
    if (!proSnap.exists) throw new HttpsError("not-found", "Professional profile not found");
    
    const proData = proSnap.data();

    // 2. Prepare the Bid Object (matching what File 2 expects)
    const newBid = {
      professionalId: uid,
      amount: Number(amount),
      name: proData?.name || "Professional",
      rating: proData?.rating || 0,
      profileImage: proData?.profileImage || null,
      timestamp: new Date().toISOString(),
      eta: 30, // You can calculate this later based on location
    };

    const jobRef = db.collection("jobs").doc(jobId);

    // 3. Update the Job Document
    // We use arrayUnion so the customer's onSnapshot listener triggers instantly
    await jobRef.update({
      bids: FieldValue.arrayUnion(newBid),
      bidders: FieldValue.arrayUnion(uid),
      hasBids: true,
      bidCount: FieldValue.increment(1)
    });

    return { success: true };
  }
);

// --- GET AVAILABLE JOBS ---
export const getAvailableJobs = onCall(
  { region: "us-central1" },
  async (request) => {
    // Logic for professionals to see open jobs
    const snapshot = await db.collection("jobs")
      .where("status", "==", "open")
      .limit(20)
      .get();
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
);