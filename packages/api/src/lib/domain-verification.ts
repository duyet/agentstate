import { customAlphabet } from "nanoid";

/**
 * Generate a domain verification token.
 *
 * Format: agentstate-verify-{random-16-chars}
 *
 * The token is used by domain providers to verify ownership via:
 * - TXT record: _agentstate.example.com TXT {token}
 * - HTTP file: http://example.com/.well-known/agentstate-{token}
 * - Meta tag: <meta name="agentstate-verification" content="{token}">
 *
 * @returns A unique verification token
 */
export function generateVerificationToken(): string {
  const BASE62 = "abcdefghijklmnopqrstuvwxyz0123456789";
  const generateRandom = customAlphabet(BASE62, 16);
  return `agentstate-verify-${generateRandom()}`;
}

/**
 * Validate a verification token format.
 *
 * @param token - The token to validate
 * @returns true if the token format is valid, false otherwise
 */
export function isValidVerificationToken(token: string): boolean {
  // Must start with "agentstate-verify-" followed by at least 16 characters
  const pattern = /^agentstate-verify-[a-z0-9]{16,}$/;
  return pattern.test(token);
}
