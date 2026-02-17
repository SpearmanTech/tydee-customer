import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

// Use the database instance
const db = getFirestore();

export const createJob = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }

  const data = request.data;

  // Standardized Job Object
  const job = {
    // Consolidated duplicates into single keys
    title: String(data.title || "Service Request"),
    description: String(data.description || ""),
    category: data.category || "General",
    subService: data.subService || "General",
    services: data.services || [],
    budget: Number(data.budget || 0),

    startPin: String(data.startPin || "0000"), 
    urgency: data.urgency ?? "normal",
    location: data.location || {},
    propertyDetails: data.propertyDetails ?? {},
    scheduled_date: data.scheduled_date ?? "",
    scheduled_time: data.scheduled_time ?? "",
    status: "pending", 
    bid_status: "open",
    assigned_professional_id: null,
    bidders: [],
    bids: [],
    hasBids: false,
    customerId: request.auth.uid,
    
    // Use the FieldValue imported at the top
    createdAt: FieldValue.serverTimestamp(),
  };

  try {
    const jobRef = await db.collection("jobs").add(job);
    return {
      success: true,
      jobId: jobRef.id,
    };
  } catch (error) {
    console.error("Error adding job:", error);
    throw new HttpsError("internal", "Failed to create job in database");
  }
});