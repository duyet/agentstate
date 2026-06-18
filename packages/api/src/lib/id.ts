import { customAlphabet, nanoid } from "nanoid";

export function generateId(): string {
  return nanoid(21);
}

const BASE62 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const generateSecret = customAlphabet(BASE62, 40);

export function generateApiKey(): string {
  return `as_live_${generateSecret()}`;
}

export function generateCapabilityToken(): string {
  return `as_cap_${generateSecret()}`;
}

/**
 * Opaque 40-char base62 secret for OAuth authorization codes and refresh
 * tokens. No prefix — these are stored only as SHA-256 hashes and never parsed.
 */
export function generateOAuthSecret(): string {
  return generateSecret();
}
