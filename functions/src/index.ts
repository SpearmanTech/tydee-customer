import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { initializeApp } from "firebase-admin/app";

// Ensure Admin SDK is only initialized once
if (admin.apps.length === 0) {
  initializeApp();
}

// ─── Marketplace ──────────────────────────────────────────────────────────────
export { submitBid, getAvailableJobs } from "./marketplace";

// ─── Jobs ─────────────────────────────────────────────────────────────────────
export { createJob as activeJobs } from "./jobs/activejobs";
export { createJob } from "./jobs/createJob";
export { acceptBid } from "./jobs/acceptbids";
export { expireJobs } from "./jobs/expirejobs";
export { syncCustomerPinToJobs } from "./jobs/startpin";

// ─── Equipment ────────────────────────────────────────────────────────────────
export { verifyHandover } from "./equipments/verifyhandover";
export { createRental } from "./equipments/createrentals";
export { getNearbyEquipment } from "./equipments/equipmentService";
export { publishListing } from "./equipments/publishListing";
export { generateThumbnail as onImageUpload } from "./equipments/onImageUpload";
export { processReturn } from "./equipments/return";

// ─── Payments ─────────────────────────────────────────────────────────────────
export { verifyAndSaveCard, chargeSavedCard } from "./payments/paystack";

export { completeJobAndCharge } from "./payments/completeJobAndCharge";
export { createRentalAndCharge } from "./payments/createRentalAndCharge";
export { activateRentalHandshake } from "./payments/activateRentalHandshake";

// ─── Webhooks ─────────────────────────────────────────────────────────────────
export { paystackWebhook } from "./webhooks/paystack";

// ─── Services ─────────────────────────────────────────────────────────────────
export { getServices } from "./services/getServices";
export { paymentService } from "./services/paymentService";
export { setProfessionalOnline } from "./services/presence";

// ─── Professionals ────────────────────────────────────────────────────────────
export { getProfessionalDashboard } from "./professionals/getProfessionalDashboard";
export { createProRecipient } from "./professionals/createProRecipient";

// ─── Auth ─────────────────────────────────────────────────────────────────────
export { onProfessionalCreate } from "./auth/onProfessionalCreate";
// export { onCustomerCreate } from "./auth/onCustomerCreate";

// ─── Notifications ────────────────────────────────────────────────────────────
export { sendPushNotification } from "./notifications/pushHandler";
export { onNewChatMessage } from "./notifications/chatPush";

// ─── Reviews ──────────────────────────────────────────────────────────────────
// FIX: was exported twice — once from "./review/submitReview" and once
// via "export * from "./submitReview"". Keeping only the correct path.
export { submitReview } from "./review/submitReview";

// ─── Didit (KYC) ──────────────────────────────────────────────────────────────
// FIX: collapsed the split import-then-export pattern into direct re-exports
export { createDiditSession } from "./didit/createDiditSession";
export { diditWebhook } from "./didit/diditWebhook";
export { verifyDiditSignatureV2 } from "./didit/didit-signature";

// ─── Waitlist ─────────────────────────────────────────────────────────────────
export { submitServiceRequest } from "./waitlist/submitServiceRequest";

// ─── Firestore Triggers ───────────────────────────────────────────────────────
// NOTE: aggregateEquipmentViews uses firebase-functions/v1 (Gen 1).
// Gen 1 only supports Node 18 and 20 — that is why package.json is set to "node": "20".
// Do NOT change this to Node 22 without migrating this trigger to Gen 2 first.
export const aggregateEquipmentViews = functions.firestore
  .document("equipment/{itemId}/shards/{shardId}")
  .onUpdate(
    async (
      change: functions.Change<functions.firestore.QueryDocumentSnapshot>,
      context: functions.EventContext
    ) => {
      const itemId = context.params.itemId;
      const db = admin.firestore();
      const itemRef = db.collection("equipment").doc(itemId);

      // Sum all shards in the sub-collection
      const shardsRef = itemRef.collection("shards");
      const snapshot = await shardsRef.get();

      let total = 0;
      snapshot.forEach((doc) => {
        total += doc.data().count || 0;
      });

      return itemRef.update({
        "stats.totalViews": total,
        "stats.lastUpdated": admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  );