import * as functions from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

const WEB_CALLBACK_URL = "https://pro.foona.co.za/professional/onboarding/verify-callback";
const NATIVE_CALLBACK_SCHEME = "foona://";

export const createDiditSession = functions.onCall(
  { secrets: ["DIDIT_API_KEY"] },
  async (request) => {
    if (!request.auth) {
      throw new functions.HttpsError("unauthenticated", "User must be logged in.");
    }

    const uid = request.auth.uid;
    const platform: "web" | "native" =
      request.data?.platform === "web" ? "web" : "native";
    const callback = platform === "web" ? WEB_CALLBACK_URL : NATIVE_CALLBACK_SCHEME;

    try {
      const response = await fetch("https://verification.didit.me/v3/session/", {
        method: "POST",
        headers: {
          "x-api-key": process.env.DIDIT_API_KEY!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workflow_id: "19e328df-3c61-49af-8a9a-0301cf15920d",
          vendor_data: uid,
          callback,
        }),
      });

      const data = await response.json();

      // TEMP DEBUG: log the full response on every call (success or failure) so we
      // can see exactly what Didit sent back. Remove once url is confirmed working.
      console.log("Didit /v3/session/ response:", JSON.stringify(data));
      console.log("Didit response status:", response.status, "ok:", response.ok);

      if (!response.ok || !data.url) {
        console.error("Didit API Error:", data);
        throw new functions.HttpsError(
          "internal",
          `Could not generate verification session: ${data?.detail ?? "unknown error"}`
        );
      }

      return {
        url: data.url as string,
        sessionToken: data.session_token as string | undefined,
        sessionId: data.session_id as string,
      };
    } catch (error) {
      console.error("createDiditSession threw:", error);
      throw new functions.HttpsError("internal", "Failed to communicate with verification server.");
    }
  }
);