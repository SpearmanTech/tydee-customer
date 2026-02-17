// expireJob
import {onSchedule} from "firebase-functions/v2/scheduler";
import {db} from "../firebase";

export const expireJobs = onSchedule("every 5 minutes", async () => {
  const cutoff = new Date(Date.now() - 60 * 60 * 1000);

  const snapshot = await db
    .collection("jobs")
    .where("status", "==", "open")
    .where("createdAt", "<=", cutoff)
    .get();

  const batch = db.batch();

  snapshot.forEach((doc) => {
    batch.update(doc.ref, {status: "expired"});
  });

  await batch.commit();
});
