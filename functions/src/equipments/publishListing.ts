import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import * as geofire from "geofire-common";

export const publishListing = functions.https.onCall(async (request) => {
  const { data, auth } = request;

  if (!auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
  }

  const db = admin.firestore();

  try {
    const dailyRate = parseFloat(data.dailyRate || "0");
    const deposit = parseFloat(data.deposit || "0");
    const tydeeFee = dailyRate * 0.15;
    const listerEarnings = dailyRate - tydeeFee;

    const lat = parseFloat(data.lat || "-29.8579");
    const lng = parseFloat(data.lng || "31.0292");
    const hash = geofire.geohashForLocation([lat, lng]);

    const listingData = {
      ownerId: auth.uid,
      title: data.title || "Untitled Gear",
      description: data.description || "",
      category: data.category || "General",
      pricing: {
        dailyRate,
        securityDeposit: deposit,
        tydeeFee,
        listerEarnings
      },
      media: data.images || [], 
      geohash: hash, 
      lat: lat,
      lng: lng,
      location: {
        geopoint: new admin.firestore.GeoPoint(lat, lng),
        area: data.area || "Durban",
        handoverType: data.handoverType || "pickup"
      },
      status: "active", 
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      // Track how many shards this document has
      numShards: 10 
    };

    // 1. Create the Main Listing
    const docRef = await db.collection("equipment").add(listingData);

    // 🗺️ STEP 1: INITIALIZE SHARDS FOR SCALABILITY
    // We create 10 shards in a sub-collection to handle "High Traffic" view counts
    const batch = db.batch();
    for (let i = 0; i < 10; i++) {
      const shardRef = docRef.collection("shards").doc(i.toString());
      batch.set(shardRef, { count: 0 });
    }
    
    // Commit the batch of shards
    await batch.commit();

    return { success: true, listingId: docRef.id };

  } catch (error) {
    console.error("PUBLISH_ERROR:", error);
    throw new functions.https.HttpsError("internal", "Database write failed.");
  }
});