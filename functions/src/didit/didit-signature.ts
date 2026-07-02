/**
 * lib/didit-signature.ts (Firebase Functions, Node/TypeScript)
 *
 * Verified against Didit's live docs (docs.didit.me/integration/webhooks) on 2026-06-19.
 *
 * X-Signature-V2 canonicalization is: shortenFloats -> sortKeys -> JSON.stringify
 * (compact separators, Unicode preserved / NOT escaped). This matches Didit's own
 * Node.js sample exactly.
 */

import { createHmac, timingSafeEqual } from "crypto";

const MAX_CLOCK_SKEW_SECONDS = 300; // 5 minutes

/** Whole-valued floats (1.0) serialize as ints (1) on Didit's side — match that. */
function shortenFloats(data: unknown): unknown {
  if (Array.isArray(data)) return data.map(shortenFloats);
  if (data !== null && typeof data === "object") {
    return Object.fromEntries(
      Object.entries(data as Record<string, unknown>).map(([k, v]) => [k, shortenFloats(v)])
    );
  }
  if (typeof data === "number" && !Number.isInteger(data) && data % 1 === 0) {
    return Math.trunc(data);
  }
  return data;
}

/** Recursively sort object keys; array order is preserved. */
function sortKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(sortKeys);
  if (obj !== null && typeof obj === "object") {
    return Object.keys(obj as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortKeys((obj as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  return obj;
}

function hmacHex(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload, "utf8").digest("hex");
}

function safeCompareHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function isTimestampFresh(timestampHeader: string | undefined): boolean {
  if (!timestampHeader) return false;
  const ts = Number(timestampHeader);
  if (!Number.isFinite(ts)) return false;
  return Math.abs(Date.now() / 1000 - ts) <= MAX_CLOCK_SKEW_SECONDS;
}

export interface VerifyResult {
  valid: boolean;
  reason?: string;
}

/**
 * Verify a Didit webhook using X-Signature-V2 (preferred) over the ALREADY-PARSED
 * JSON body. Firebase's onRequest gives you `req.body` pre-parsed by Express's
 * json() middleware, so X-Signature (raw bytes) isn't reliably usable here unless
 * you've configured a raw-body middleware — V2 is the right default for this stack.
 */
export function verifyDiditSignatureV2(
  parsedBody: unknown,
  secret: string,
  headers: { signatureV2?: string; timestamp?: string }
): VerifyResult {
  if (!isTimestampFresh(headers.timestamp)) {
    return { valid: false, reason: "stale_or_missing_timestamp" };
  }
  if (!headers.signatureV2) {
    return { valid: false, reason: "missing_signature_v2_header" };
  }

  const canonical = JSON.stringify(sortKeys(shortenFloats(parsedBody)));
  const expected = hmacHex(secret, canonical);
  const ok = safeCompareHex(expected, headers.signatureV2.trim());

  return ok ? { valid: true } : { valid: false, reason: "signature_mismatch" };
}