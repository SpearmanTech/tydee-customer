import * as functions from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { verifyDiditSignatureV2 } from "../didit/didit-signature";

if (!admin.apps.length) {
  admin.initializeApp();
}

// Exact, case-sensitive status strings per Didit's docs (confirmed 2026-06-19):
// "Not Started" | "In Progress" | "Awaiting User" | "In Review" | "Approved" |
// "Declined" | "Resubmitted" | "Abandoned" | "Expired" | "Kyc Expired"

export const diditWebhook = functions.onRequest(
  { secrets: ["DIDIT_WEBHOOK_SECRET"] },
  async (req, res) => {
    const signatureV2 = req.headers["x-signature-v2"] as string | undefined;
    const timestamp = req.headers["x-timestamp"] as string | undefined;

    const secret = process.env.DIDIT_WEBHOOK_SECRET;
    if (!secret) {
      console.error("DIDIT_WEBHOOK_SECRET is not configured");
      res.status(500).send("Server misconfigured");
      return;
    }

    // req.body is already JSON-parsed by the Functions runtime's body parser.
    // We verify X-Signature-V2 against that parsed object (canonical re-serialization),
    // which is the correct approach for this stack per Didit's docs.
    const result = verifyDiditSignatureV2(req.body, secret, {
      signatureV2,
      timestamp,
    });

    if (!result.valid) {
      console.warn("Didit webhook signature verification failed:", result.reason);
      res.status(401).send("Unauthorized: Invalid or stale signature");
      return;
    }

    const payload = req.body;
    const uid: string | undefined = payload.vendor_data;
    const status: string | undefined = payload.status;
    const decision = payload.decision;
    const eventId: string | undefined = payload.event_id;

    if (!uid) {
      res.status(400).send("Bad Request: Missing vendor_data");
      return;
    }

    try {
      const db = admin.firestore();

      // --- Idempotency: dedupe on event_id ---
      if (eventId) {
        const eventRef = db.collection("webhook_events").doc(eventId);
        try {
          await eventRef.create({
            webhookType: payload.webhook_type ?? null,
            sessionId: payload.session_id ?? null,
            status: status ?? null,
            receivedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        } catch (err: any) {
          if (err?.code === 6) {
            // ALREADY_EXISTS -- duplicate delivery, already processed.
            res.status(200).send("Duplicate delivery, already processed.");
            return;
          }
          throw err;
        }
      }

      // Only handle session-level status events here.
      // (user.status.updated / business.* / transaction.* would need separate branches
      // if you subscribe to those event families later.)
      if (payload.webhook_type !== "status.updated" && payload.webhook_type !== "data.updated") {
        console.log(`Received non-session webhook_type: ${payload.webhook_type}, ignoring.`);
        res.status(200).send("Acknowledged (no action for this event type).");
        return;
      }

      const professionalRef = db.collection("professionals").doc(uid);

      const baseUpdate: Record<string, unknown> = {
        "verification.identity.status": status?.toLowerCase().replace(/\s+/g, "_") ?? "unknown",
        "verification.identity.diditSessionId": payload.session_id ?? null,
        "verification.identity.lastWebhookType": payload.webhook_type ?? null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      switch (status) {
        case "Approved":
          await professionalRef.set(
            {
              ...baseUpdate,
              "verification.identity.completedAt": admin.firestore.FieldValue.serverTimestamp(),
              "verification.identity.decision": decision ?? null,
            },
            { merge: true }
          );
          // Flip onboarding switch on approval, as in your original logic.
          await db.collection("users").doc(uid).set(
            { hasCompletedOnboarding: true },
            { merge: true }
          );
          break;

        case "Declined":
          await professionalRef.set(
            {
              ...baseUpdate,
              "verification.identity.declinedAt": admin.firestore.FieldValue.serverTimestamp(),
              "verification.identity.decision": decision ?? null,
            },
            { merge: true }
          );
          break;

        case "In Review":
        case "In Progress":
        case "Awaiting User":
          await professionalRef.set(baseUpdate, { merge: true });
          break;

        case "Resubmitted":
          await professionalRef.set(
            {
              ...baseUpdate,
              "verification.identity.resubmitInfo": payload.resubmit_info ?? null,
            },
            { merge: true }
          );
          break;

        case "Abandoned":
          await professionalRef.set(baseUpdate, { merge: true });
          break;

        case "Expired":
        case "Kyc Expired": // exact casing per Didit's current docs
          await professionalRef.set(baseUpdate, { merge: true });
          break;

        case "Not Started":
          await professionalRef.set(baseUpdate, { merge: true });
          break;

        default:
          console.warn(`Unhandled Didit status: ${status}`);
      }

      res.status(200).send("Webhook received and processed.");
    } catch (error) {
      console.error("Webhook processing error:", error);
      res.status(500).send("Internal Server Error");
    }
  }
);