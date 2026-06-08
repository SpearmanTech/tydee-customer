import * as geofire from 'geofire-common';
import * as admin from 'firebase-admin';

/**
 * This is a Backend version of the Geo-query.
 * It uses the admin SDK to fetch documents within a radius.
 */
export const getNearbyEquipment = async (userLat: number, userLng: number, radiusInKm = 15) => {
  // 1. FIX: Explicitly type the center as a [number, number] tuple
  const center: [number, number] = [userLat, userLng];
  const radiusInM = radiusInKm * 1000;

  const db = admin.firestore();

  // 2. Get the geohash range bounds
  const bounds = geofire.geohashQueryBounds(center, radiusInM);
  const promises = [];

  for (const b of bounds) {
    // FIX: Using admin SDK query syntax
    const q = db.collection('equipment')
      .orderBy('geohash')
      .startAt(b[0])
      .endAt(b[1])
      .get();
    
    promises.push(q);
  }

  const snapshots = await Promise.all(promises);
  const matchingDocs: any[] = [];

  for (const snap of snapshots) {
    for (const doc of snap.docs) {
      const data = doc.data();
      
      // 3. FIX: Cast the coordinates to [number, number] to satisfy Geofire
      const location: [number, number] = [data.lat, data.lng];
      const distanceInKm = geofire.distanceBetween(location, center);
      const distanceInM = distanceInKm * 1000;

      if (distanceInM <= radiusInM) {
        matchingDocs.push({ id: doc.id, ...data });
      }
    }
  }

  return matchingDocs;
};