// activeJobs
import * as admin from "firebase-admin";
import {HttpsError, onCall} from "firebase-functions/v2/https";

const db = admin.firestore();

interface CreateJobPayload {
  title: string;
  description?: string;
  services: string[];
  budget?: number | null;
  urgency?: "low" | "normal" | "high";
  location: Record<string, unknown>;
  propertyDetails?: Record<string, unknown>;
  scheduled_date?: string | null;
  scheduled_time?: string | null;
}


export const createJob = onCall(async (request) => {
  const {data, auth} = request;

  if (!auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }

  const {
    title,
    description,
    services,
    budget,
    urgency,
    location,
    propertyDetails,
    scheduled_date,
    scheduled_time,
  } = data as CreateJobPayload;


  if (!title || !services || !location) {
    throw new HttpsError("invalid-argument", "Missing required fields");
  }

  const jobRef = db.collection("jobs").doc();

  await jobRef.set({
    customerId: auth.uid,
    title,
    description: description || "",
    services,
    budget: budget || null,
    urgency: urgency || "normal",
    location,
    assigned_professional_id: null,
    bid_status: "open",
    propertyDetails: propertyDetails || {},
    scheduledDate: scheduled_date || null,
    scheduledTime: scheduled_time || null,
    status: "open",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: admin.firestore.Timestamp.fromMillis(
      Date.now() + 60 * 60 * 1000
    ),
    acceptedBidId: null,
  });

  return {jobId: jobRef.id};
});
