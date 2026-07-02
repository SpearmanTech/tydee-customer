import * as admin from "firebase-admin";
import * as functions from "firebase-functions/v2";
import * as geofire from "geofire-common";

export const publishListing = functions.https.onCall(async (request) => {
  const { data, auth } = request;

  if (!auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be logged in.",
    );
  }

  const db = admin.firestore();

  // 📍 Address validation — no fallback coordinates.
  // A listing with no real, geocoded address must not be allowed to publish.
  const lat = parseFloat(data.lat);
  const lng = parseFloat(data.lng);
  const area = typeof data.area === "string" ? data.area.trim() : "";
  const placeId = typeof data.placeId === "string" ? data.placeId.trim() : "";

  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "A valid latitude is required. Please select an address from the search results.",
    );
  }

  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "A valid longitude is required. Please select an address from the search results.",
    );
  }

  if (!area) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "An address is required. Please select an address from the search results.",
    );
  }

  if (!placeId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Address must be selected from search results, not entered manually.",
    );
  }

  try {
    const dailyRate = parseFloat(data.dailyRate || "0");
    const deposit = parseFloat(data.deposit || "0");
    const FoonaFee = dailyRate * 0.15;
    const listerEarnings = dailyRate - FoonaFee;

    const hash = geofire.geohashForLocation([lat, lng]);

    const listingData = {
      ownerId: auth.uid,
      title: data.title || "Untitled Gear",
      description: data.description || "",
      category: data.category || "General",
      pricing: {
        dailyRate,
        securityDeposit: deposit,
        FoonaFee,
        listerEarnings,
      },
      media: data.images || [],
      geohash: hash,
      lat: lat,
      lng: lng,
      location: {
        geopoint: new admin.firestore.GeoPoint(lat, lng),
        area: area,
        placeId: placeId,
        handoverType: data.handoverType || "pickup",
      },
      status: "active",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      // Track how many shards this document has
      numShards: 10,
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
    // Don't mask deliberate HttpsErrors (e.g. validation) as generic internal errors —
    // only wrap genuinely unexpected failures (DB writes, etc.).
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError("internal", "Database write failed.");
  }
});