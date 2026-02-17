import {getApps, initializeApp} from "firebase-admin/app";
import {getFirestore} from "firebase-admin/firestore";
import {onRequest} from "firebase-functions/v2/https";

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

export const getServices = onRequest(async (req, res) => {
  try {
    const snapshot = await db
      .collection("services")
      .where("active", "==", true)
      .get();

    const services = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json({services});
  } catch (error) {
    console.error("getServices error:", error);
    res.status(500).json({error: "Failed to fetch services"});
  }
});
