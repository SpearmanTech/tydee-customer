import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";

// Runs every 15 minutes to aggregate demand
export const aggregateDemandZones = functions.scheduler.onSchedule("every 15 minutes", async (event) => {
  const db = admin.firestore();
  
  // 1. Fetch only active/recruiting jobs
  const jobsSnapshot = await db.collection("jobs")
    .where("status", "in", ["active", "recruiting"])
    .get();

  // 2. Tally the jobs by their Geohash Prefix (Zone)
  // A geohash of length 5 is approx 4.9km x 4.9km. Length 6 is approx 1.2km x 0.6km.
  const GEOHASH_PRECISION = 5; 
  const zones: Record<string, any> = {};

  jobsSnapshot.forEach((doc) => {
    const job = doc.data();
    if (!job.geohash) return;

    // Group jobs by cutting the geohash to the desired precision
    const zoneHash = job.geohash.substring(0, GEOHASH_PRECISION);

    if (!zones[zoneHash]) {
      zones[zoneHash] = {
        geohash: zoneHash,
        count: 0,
        categories: {}, // Track demand by service type
        totalValue: 0,
        // Approximate center of this geohash (you can use geofire-common to decode this exactly)
        lat: job.location?.lat || 0,
        lng: job.location?.lng || 0, 
      };
    }

    // Increment tallies
    zones[zoneHash].count += 1;
    zones[zoneHash].totalValue += (job.price || job.budget || 0);
    
    const category = job.service || 'general';
    zones[zoneHash].categories[category] = (zones[zoneHash].categories[category] || 0) + 1;
  });

  // 3. Write the aggregated data to the 'demand_zones' collection
  const batch = db.batch();
  
  // Clear old zones (Optional: you can also just overwrite/merge to save writes)
  const oldZones = await db.collection("demand_zones").get();
  oldZones.forEach(doc => batch.delete(doc.ref));

  // Write new zones
  Object.values(zones).forEach(zone => {
    const zoneRef = db.collection("demand_zones").doc(zone.geohash);
    batch.set(zoneRef, {
      ...zone,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });

  await batch.commit();
  console.log(`Aggregated ${jobsSnapshot.size} jobs into ${Object.keys(zones).length} Demand Zones.`);
});