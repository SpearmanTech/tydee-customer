import * as geofire from 'geofire-common';
import { query, collection, orderBy, startAt, endAt, getDocs } from 'firebase/firestore';
import { db } from "@/firebase/firebase"; // 👉 Verify this points to your frontend Firebase init

/**
 * 📱 FRONTEND VERSION
 * Runs directly on the user's phone for fast, cheap marketplace loading.
 */
export const getNearbyEquipmentClient = async (userLat: number, userLng: number, radiusInKm = 15) => {
  const center: [number, number] = [userLat, userLng];
  const radiusInM = radiusInKm * 1000;

  // 1. Get the geohash range bounds
  const bounds = geofire.geohashQueryBounds(center, radiusInM);
  const promises = [];

  for (const b of bounds) {
    // 🛠️ Mobile Client SDK query syntax
    const q = query(
      collection(db, 'equipment'),
      orderBy('geohash'),
      startAt(b[0]),
      endAt(b[1])
    );
    promises.push(getDocs(q));
  }

  const snapshots = await Promise.all(promises);
  const matchingDocs: any[] = [];

  for (const snap of snapshots) {
    for (const doc of snap.docs) {
      const data = doc.data();
      
      const distanceInKm = geofire.distanceBetween([data.lat, data.lng], center);
      const distanceInM = distanceInKm * 1000;

      // Filter out false positives & only show active Gamma-verified gear
      if (distanceInM <= radiusInM && data.status === 'active') {
        matchingDocs.push({ id: doc.id, ...data });
      }
    }
  }

  return matchingDocs;
};