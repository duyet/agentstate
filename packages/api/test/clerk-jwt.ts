// ---------------------------------------------------------------------------
// Test-only Clerk session JWT signer.
// Signs RS256 JWTs with the private key matching the public key in
// wrangler.test.jsonc (CLERK_JWT_KEY). Lets tests exercise the real
// verifyToken path networkless, without calling Clerk or mocking modules.
// ---------------------------------------------------------------------------

// Private RSA JWK matching CLERK_JWT_KEY in wrangler.test.jsonc.
const TEST_PRIVATE_JWK = {
  kty: "RSA" as const,
  n: "txMkYQsRsixcwsh57x9uONb95zUj4-HTeWW1ZEF6FV087NEcN7AWoE3AOiiz5is8y1hc4l-1cF6Pniu8yglT8NWd3ESTYx9z0xs_KaXICsAl_H1YGKn_2XQVeUbNK7hmOHIJGy-2zJ7khBAqBkGXoDNmBSBhSBKYhjVCT6JAjKFIDqa5NBjfD4VLZJZFtQcKM0ep1eesDeQO71RtxDh7JhG7aG45KJmEsIQc75gbCkZGTaTX_2Emx2YxlASbKnbL0DTbnHiPnYoxxDKE_jotxwu4rMQkE3nr1iW0ycWIR4bhFVoWHnCClfjHhVtNScTKnkBFoICpXdzQFs1OIuwg3Q",
  e: "AQAB",
  d: "Dv7ZpZGX9Q7sAzATcsTRjQTT08l3GN5MFDRtR5q9t_xvi4XzqH5l1WLA-n06gmwrZOGQ7CGYSu29QvYErEzYIWYx8b3z5PQ0KHLMeT9ryQZPpjnodSQO7EjKoyjWOzz1sde_YLNyEZp4j8uuJt3eYFV4HLaNWVoH6xhM3UPQ7ePP1k2ON8TLLfE_Q4sOGCM474dluUJelUNJ0lWc8UTudeUbcQedOl00kOPXyXFwRZ3zGKh00YSg5JNhKXNl57JWS_ZpanZgxD_E8CqCmD6gv2fct5m3WFfMbKpRClhz4xfbWDE3iV8hi8KZDkqNCBmpj5ihr6XDqfbUWWHs9VPbaQ",
  p: "-24yqZ4BCT4M9836AHMB20Q7h0KUzKJWK9kCAU-gDM4iwp01Sn_GswiEcGKwS8drq3UmFaqfIUWpMNadYrmc9HQpgXVPvXxg_7v3moHvJffeRfuS3_3Nvx9I9cVMZDHTu-VLxmq5qHXTciCfbf0DLbYcJnUoiD2Rf_A-FQel-7k",
  q: "umbp1iUe4j_6PwEnJqr_Pxq3A3h7bZVgPIfQSk6-ffRAcN1rz_fuaBVi6TOVrKjxLvq1rrA0YXMuGT2IkfHyOQNM8VBomSicVAqqLbIEMD6E0BjsfBbDNzg3RT05SS1ITOgU-A6L4ENHLIVoaZ2IXb3wV3H7fXQf0kjXyC2diEU",
  dp: "rgSsPeck0m_G6-_8uzjeLRNBnDFB6Yvl1j1A_QVOQe6d8lJ6YtCjBqC7gUlcuWYRqD7RmCdaMd4T5sBzd7P95NdNLtOx1_Tw8a74BVEu4vl2NruTAUKZl1Eg3zGp2KL_58kgs_iD_QtnyFK55Zc7DvU-8IMgBYOPY5w0a7u6bsk",
  dq: "ZcoFL5edwddGBFnQ02DVedRQ1GhanoDPyL4xlCJkC8vx1LBVS4AMhHIJTWeJ-HtZGVp3FCnMsNqA9e-QQIJqz49p2O0b8Wcn1wzr2YA4oU_CnxC9MxYLDIB6Tikcu0UrEjQ6HytyXsjeeQVw-xu3d9ldAaOQvfVH20FD9GBUgjE",
  qi: "lBlGElGdy1O79ywGKL1t2bfJtVmiQr7ELIo3e_haysAoHU4Jt_paM624xiAZpPsGD8YWdK4yZgzr8EItQ7QpJEviroLcuwQow-PWuocL_6_GMkZqnuuaIIxzS2aZnggo2JfZkYeypRJztXZraV3jZSWbTRwEdyEDiBkDc-GDt48",
};

function base64Url(input: ArrayBuffer | Uint8Array): string {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function strToBytes(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

export interface TestSessionOptions {
  /** Clerk user id (sub claim). */
  userId?: string;
  /** Clerk active org id (o_id claim). Defaults to a stable test org. */
  orgId?: string;
  /** Omit the org claim entirely (simulates a personal account with no org). */
  noOrg?: boolean;
  /** Authorized party (azp). Defaults to the dashboard origin. */
  azp?: string;
  /** Seconds until expiry. Defaults to 3600. */
  expiresInSec?: number;
}

/**
 * Sign a Clerk-shaped session JWT valid against CLERK_JWT_KEY in the test env.
 */
export async function signTestSessionToken(opts: TestSessionOptions = {}): Promise<string> {
  const userId = opts.userId ?? "user_test_001";
  const orgId = opts.orgId ?? "clerk_test_org_001";
  const azp = opts.azp ?? "http://localhost:3000";
  const expiresInSec = opts.expiresInSec ?? 3600;

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload: Record<string, unknown> = {
    iss: "https://test.clerk.accounts.dev",
    sub: userId,
    aud: "test-app",
    azp,
    iat: now,
    nbf: now,
    exp: now + expiresInSec,
    sid: "sess_test_001",
  };
  // Clerk org claims — omitted entirely for a personal account (no active org).
  if (!opts.noOrg) {
    payload.o_id = orgId;
    payload.o_slug = "test-org";
    payload.o_role = "org:admin";
  }

  const encHeader = base64Url(strToBytes(JSON.stringify(header)));
  const encPayload = base64Url(strToBytes(JSON.stringify(payload)));
  const signingInput = `${encHeader}.${encPayload}`;

  const key = await crypto.subtle.importKey(
    "jwk",
    TEST_PRIVATE_JWK,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, strToBytes(signingInput));

  return `${signingInput}.${base64Url(signature)}`;
}

/** Build a Cookie header value carrying a __session token. */
export function sessionCookie(token: string): string {
  return `__session=${token}`;
}
