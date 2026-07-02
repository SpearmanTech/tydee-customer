import * as functions from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { Resend } from "resend";

if (!admin.apps.length) {
  admin.initializeApp();
}

// ── Resend config ─────────────────────────────────────────────────────────────
// Set your API key once before deploying:
//   firebase functions:secrets:set RESEND_API_KEY
//   firebase functions:secrets:set NOTIFY_EMAIL_TO
//
// Get your key at: https://resend.com/api-keys
// NOTIFY_EMAIL_TO is the inbox that receives the lead notification emails.
// ─────────────────────────────────────────────────────────────────────────────
const RESEND_SECRETS = ["RESEND_API_KEY", "NOTIFY_EMAIL_TO"];

const CATEGORY_LABELS: Record<string, string> = {
  electrician: "Electrician",
  plumber: "Plumber",
  welder: "Welder",
  gardener: "Gardener",
  barber: "Barber",
  cleaner: "Cleaner",
  handyman: "Handyman",
  painter: "Painter",
  other: "Other",
};

const URGENCY_LABELS: Record<string, string> = {
  urgent: "Urgent (today/tomorrow)",
  this_week: "This week",
  flexible: "Flexible / just exploring",
};

export const submitServiceRequest = functions.onCall(
  { secrets: RESEND_SECRETS },
  async (request) => {
    const { data, auth } = request;

    // Auth optional by design: captures demand from browsing visitors too.
    const uid = auth?.uid ?? null;

    // ── Validation ───────────────────────────────────────────────────────────
    const category =
      typeof data.category === "string" ? data.category.trim() : "";
    const urgency =
      typeof data.urgency === "string" ? data.urgency.trim() : "";
    const contactMethod =
      typeof data.contactMethod === "string" ? data.contactMethod.trim() : "";
    const contactValue =
      typeof data.contactValue === "string" ? data.contactValue.trim() : "";
    const description =
      typeof data.description === "string" ? data.description.trim() : "";
    const areaAddress =
      typeof data.areaAddress === "string" ? data.areaAddress.trim() : "";
    const placeId =
      typeof data.placeId === "string" ? data.placeId.trim() : "";
    const lat = parseFloat(data.lat);
    const lng = parseFloat(data.lng);

    if (!category || !CATEGORY_LABELS[category]) {
      throw new functions.HttpsError(
        "invalid-argument",
        "A valid service category is required."
      );
    }
    if (!urgency || !URGENCY_LABELS[urgency]) {
      throw new functions.HttpsError(
        "invalid-argument",
        "A valid urgency option is required."
      );
    }
    if (
      !contactMethod ||
      !["call", "whatsapp", "email"].includes(contactMethod)
    ) {
      throw new functions.HttpsError(
        "invalid-argument",
        "A valid contact method is required."
      );
    }
    if (!contactValue) {
      throw new functions.HttpsError(
        "invalid-argument",
        "Contact details are required."
      );
    }
    if (!areaAddress || !placeId) {
      throw new functions.HttpsError(
        "invalid-argument",
        "An area is required. Please select an address from the search results."
      );
    }
    if (
      !Number.isFinite(lat) ||
      lat < -90 ||
      lat > 90 ||
      !Number.isFinite(lng) ||
      lng < -180 ||
      lng > 180
    ) {
      throw new functions.HttpsError(
        "invalid-argument",
        "A valid location is required."
      );
    }

    // ── Write to Firestore ───────────────────────────────────────────────────
    const db = admin.firestore();

    const requestData = {
      uid,
      category,
      description,
      urgency,
      contactMethod,
      contactValue,
      area: {
        geopoint: new admin.firestore.GeoPoint(lat, lng),
        address: areaAddress,
        placeId,
      },
      status: "unfulfilled",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    let docId: string;
    try {
      const docRef = await db.collection("serviceRequests").add(requestData);
      docId = docRef.id;
    } catch (error) {
      console.error("SERVICE_REQUEST_WRITE_ERROR:", error);
      throw new functions.HttpsError(
        "internal",
        "Could not save your request. Please try again."
      );
    }

    // ── Send notification email via Resend ───────────────────────────────────
    // Best-effort: failure here must NEVER lose the lead already in Firestore.
    try {
      await sendNotificationEmail({
        docId,
        category: CATEGORY_LABELS[category],
        urgency: URGENCY_LABELS[urgency],
        contactMethod,
        contactValue,
        areaAddress,
        description,
      });
    } catch (error) {
      console.error("SERVICE_REQUEST_EMAIL_ERROR (lead was still saved):", error);
    }

    return { success: true, requestId: docId };
  }
);

// ── Resend email helper ───────────────────────────────────────────────────────
async function sendNotificationEmail(details: {
  docId: string;
  category: string;
  urgency: string;
  contactMethod: string;
  contactValue: string;
  areaAddress: string;
  description: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFY_EMAIL_TO;

  if (!apiKey || !to) {
    console.error(
      "Resend secrets not configured — skipping email notification. " +
        "Run: firebase functions:secrets:set RESEND_API_KEY " +
        "and: firebase functions:secrets:set NOTIFY_EMAIL_TO"
    );
    return;
  }

  const resend = new Resend(apiKey);

  const subject = `New ${details.category} request — ${details.urgency}`;

  // Plain-text body
  const text = [
    "New service request received.",
    "",
    `Category:    ${details.category}`,
    `Urgency:     ${details.urgency}`,
    `Area:        ${details.areaAddress}`,
    `Contact via: ${details.contactMethod}`,
    `Contact:     ${details.contactValue}`,
    `Description: ${details.description || "(none provided)"}`,
    "",
    `Request ID: ${details.docId}`,
  ].join("\n");

  // HTML body — clean and readable in any inbox
  const html = `
    <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #1e293b; margin-bottom: 4px;">New Service Request</h2>
      <p style="color: #64748b; margin-top: 0;">A customer is looking for help.</p>

      <table style="width: 100%; border-collapse: collapse; margin-top: 24px;">
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; width: 38%;">Category</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-weight: 600;">${details.category}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b;">Urgency</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-weight: 600;">${details.urgency}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b;">Area</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-weight: 600;">${details.areaAddress}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b;">Contact via</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-weight: 600;">${details.contactMethod}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b;">Contact</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-weight: 600;">${details.contactValue}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #64748b; vertical-align: top;">Description</td>
          <td style="padding: 10px 0; color: #1e293b;">${details.description || "<em style='color:#94a3b8'>None provided</em>"}</td>
        </tr>
      </table>

      <p style="margin-top: 32px; font-size: 12px; color: #94a3b8;">
        Request ID: ${details.docId}
      </p>
    </div>
  `;

  const { error } = await resend.emails.send({
    from: "Tydee Pro <no-reply@yourdomain.com>", // replace with your verified Resend domain
    to,
    subject,
    text,
    html,
  });

  if (error) {
    // Throw so the caller can log it — lead is already safe in Firestore
    throw new Error(`Resend API error: ${JSON.stringify(error)}`);
  }
}