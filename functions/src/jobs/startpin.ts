import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

export const syncCustomerPinToJobs = onDocumentUpdated(
  'customers/{customerId}', 
  async (event) => {
    const change = event.data;
    if (!change) return null;

    const newData = change.after.data();
    const oldData = change.before.data();

    if (!newData || !oldData) return null;

    // Use ?? to prevent bugs if a PIN somehow evaluates to a falsy value like 0
    const newPin = newData.permanentPin ?? newData.startPin;
    const oldPin = oldData.permanentPin ?? oldData.startPin;

    // Exit early if the PIN didn't change, or if it doesn't exist
    if (!newPin || newPin === oldPin) return null;

    const customerId = event.params.customerId;
    const db = admin.firestore();

    try {
      // Find all active jobs for this customer
      const activeJobsQuery = await db.collection('jobs')
        .where('customerId', '==', customerId)
        .where('status', 'in', ['pending', 'open', 'assigned'])
        .get();

      if (activeJobsQuery.empty) {
        console.log(`No active jobs found for customer ${customerId}. Sync skipped.`);
        return null;
      }

      const batch = db.batch();
      let operationCount = 0;
      
      activeJobsQuery.forEach((doc) => {
        // Hard limit protection: Firestore batches max out at 500
        if (operationCount < 500) {
          batch.update(doc.ref, { startPin: String(newPin) });
          operationCount++;
        } else {
          console.warn(`Customer ${customerId} exceeded 500 active jobs. Only the first 500 were updated.`);
        }
      });

      await batch.commit();
      console.log(`Successfully synced new PIN to ${operationCount} jobs for customer ${customerId}.`);
      return null;

    } catch (error) {
      console.error(`Failed to sync PINs for customer ${customerId}:`, error);
      // Let it throw so Firebase knows the function execution failed
      throw error; 
    }
  }
);