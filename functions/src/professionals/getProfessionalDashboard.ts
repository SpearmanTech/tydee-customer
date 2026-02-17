import {onRequest} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {Request, Response} from "express";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export const getProfessionalDashboard = onRequest(
  {region: "us-central1"},
  async (req: Request, res: Response) => {
    try {
      const {uid} = req.body as { uid?: string };

      if (!uid) {
        res.status(400).json({error: "Missing uid"});
        return;
      }

      // 1. Fetch profile
      const userSnap = await db.collection("professionals").doc(uid).get();

      if (!userSnap.exists) {
        res.status(404).json({error: "User profile not found"});
        return;
      }

      const user = {
        id: userSnap.id,
        ...userSnap.data(),
      };

      // 2. Fetch jobs
      // 2. Fetch jobs
      const jobsSnap = await db
        .collection("jobs")
        .where("status", "==", "open")
        .get();

      const jobs = jobsSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      // 3. Fetch services
      const servicesSnap = await db
        .collection("services")
        .where("active", "==", true)
        .get();

      const services = servicesSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      // 4. Metrics
      const metrics = {
        availableJobs: jobs.length,
        activeServices: services.length,
      };

      res.status(200).json({
        user,
        metrics,
        jobs,
        services,
      });
    } catch (error) {
      console.error("Dashboard error:", error);
      res.status(500).json({error: "Internal server error"});
    }
  }
);
