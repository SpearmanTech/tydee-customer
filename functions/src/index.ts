import * as functions from "firebase-functions/v1"; // 🛠️ Fix 1: Explicitly use v1 for .document()
import * as admin from "firebase-admin";
import { initializeApp } from "firebase-admin/app";

// Ensure app is only initialized once
if (admin.apps.length === 0) {
  initializeApp();
}

// 1. Marketplace Functions
export { submitBid, getAvailableJobs } from "./marketplace";
export { createJob as activeJobs } from "./jobs/activejobs"; 
export { createJob } from "./jobs/createJob";
export { acceptBid } from "./jobs/acceptbids";               
export { verifyHandover } from "./equipments/verifyhandover";
export { createRental } from "./equipments/createrentals";
export { expireJobs } from "./jobs/expirejobs";
export { verifyAndSaveCard, chargeSavedCard } from "./payments/paystack";
export { getServices } from "./services/getServices";
export { getProfessionalDashboard } from "./professionals/getProfessionalDashboard";
export { paystackWebhook } from "./webhooks/paystack";
export { initiateProPayout } from "./payments/payout";
export { onProfessionalCreate } from "./auth/onProfessionalCreate";
//export { onCustomerCreate } from "./auth/onCustomerCreate";
export { completeJobAndCharge } from "./payments/completeJobAndCharge";
export { sendPushNotification } from "./notifications/pushHandler";
export { getNearbyEquipment } from "./equipments/equipmentService";
export { publishListing } from "./equipments/publishListing"
export { createProRecipient } from "./professionals/createProRecipient";
export { paymentService } from "./services/paymentService";
export { setProfessionalOnline } from "./services/presence";
export { generateThumbnail as onImageUpload } from "./equipments/onImageUpload";
// Add these to your existing exports in index.ts
export { onNewChatMessage } from "./notifications/chatPush";
// Pro Equipment Logic
export { processReturn } from "./equipments/return";
export { createRentalAndCharge } from "./payments/createRentalAndCharge";
export { activateRentalHandshake } from "./payments/activateRentalHandshake";
// Pro Job Logic
export { syncCustomerPinToJobs } from "./jobs/startpin"; // Adjust "startJobPin" to match your actual export name


// 🚀 MILLIONS-OF-USERS SCALE: SHARD AGGREGATOR
export const aggregateEquipmentViews = functions.firestore
  .document('equipment/{itemId}/shards/{shardId}')
  .onUpdate(async (
    change: functions.Change<functions.firestore.QueryDocumentSnapshot>, // 🛠️ Fix 2: Explicit types
    context: functions.EventContext                                     // 🛠️ Fix 3: Explicit context
  ) => {
    const itemId = context.params.itemId;
    const db = admin.firestore();
    const itemRef = db.collection('equipment').doc(itemId);

    // Sum all 10 shards in the sub-collection
    const shardsRef = itemRef.collection('shards');
    const snapshot = await shardsRef.get();

    let total = 0;
    snapshot.forEach(doc => {
      const data = doc.data();
      total += data.count || 0;
    });

    // Update the main document with the new total
    return itemRef.update({ 
      "stats.totalViews": total,
      "stats.lastUpdated": admin.firestore.FieldValue.serverTimestamp()
    });
  });