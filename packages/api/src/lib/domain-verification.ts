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

// ---------------------------------------------------------------------------
// Verification Methods
// ---------------------------------------------------------------------------

/** Timeout for each verification attempt (5 seconds) */
const VERIFY_TIMEOUT_MS = 5_000;

/**
 * Reject single-label hosts, IP literals, and obviously invalid targets.
 * Prevents SSRF by ensuring we only make outbound requests to real domain names.
 */
function isSafeVerificationTarget(domain: string): boolean {
  // Must contain at least one dot (reject single-label hosts like "localhost")
  if (!domain.includes(".")) return false;
  // Reject IPv4 literals (e.g. "127.0.0.1")
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(domain)) return false;
  // Reject IPv6 literals (e.g. "::1", "[::1]")
  if (domain.startsWith("[") || /^[0-9a-f:]+$/i.test(domain.replace(/\./g, ""))) return false;
  return true;
}

export type VerificationMethod = "dns_txt" | "http_file" | "meta_tag";

export interface VerificationCheckResult {
  method: VerificationMethod;
  success: boolean;
  error?: string;
}

/**
 * Verify domain ownership via DNS TXT record.
 *
 * Queries Cloudflare DNS-over-HTTPS for a TXT record at `_agentstate.{domain}`
 * and checks if any record matches the expected verification token.
 */
export async function verifyDnsTxt(
  domain: string,
  expectedToken: string,
): Promise<VerificationCheckResult> {
  if (!isSafeVerificationTarget(domain)) {
    return { method: "dns_txt", success: false, error: "Invalid domain for verification" };
  }
  try {
    const name = `_agentstate.${domain}`;
    const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=TXT`;
    const response = await fetch(url, {
      headers: { Accept: "application/dns-json" },
      signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
    });

    if (!response.ok) {
      return { method: "dns_txt", success: false, error: `DNS query returned ${response.status}` };
    }

    const data = (await response.json()) as {
      Answer?: Array<{ type: number; data: string }>;
    };

    if (!data.Answer || data.Answer.length === 0) {
      return { method: "dns_txt", success: false, error: "No TXT records found" };
    }

    // TXT record values are quoted in DNS responses — strip quotes
    const matched = data.Answer.some((record) => {
      const value = record.data.replace(/^"|"$/g, "");
      return value === expectedToken;
    });

    return { method: "dns_txt", success: matched, error: matched ? undefined : "Token not found in TXT records" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "DNS TXT verification failed";
    return { method: "dns_txt", success: false, error: msg };
  }
}

/**
 * Verify domain ownership via HTTP well-known file.
 *
 * Fetches `https://{domain}/.well-known/agentstate-{token}` and checks
 * if the response body contains the token.
 */
export async function verifyHttpFile(
  domain: string,
  expectedToken: string,
): Promise<VerificationCheckResult> {
  if (!isSafeVerificationTarget(domain)) {
    return { method: "http_file", success: false, error: "Invalid domain for verification" };
  }
  try {
    const url = `https://${domain}/.well-known/agentstate-${expectedToken}`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
      redirect: "follow",
    });

    if (!response.ok) {
      return { method: "http_file", success: false, error: `HTTP ${response.status}` };
    }

    const body = (await response.text()).trim();
    const success = body === expectedToken;

    return { method: "http_file", success, error: success ? undefined : "Token mismatch in response body" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "HTTP file verification failed";
    return { method: "http_file", success: false, error: msg };
  }
}

/**
 * Verify domain ownership via HTML meta tag.
 *
 * Fetches the domain's homepage and looks for:
 * `<meta name="agentstate-verification" content="{token}">`
 */
export async function verifyMetaTag(
  domain: string,
  expectedToken: string,
): Promise<VerificationCheckResult> {
  if (!isSafeVerificationTarget(domain)) {
    return { method: "meta_tag", success: false, error: "Invalid domain for verification" };
  }
  try {
    const url = `https://${domain}/`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
      redirect: "follow",
    });

    if (!response.ok) {
      return { method: "meta_tag", success: false, error: `HTTP ${response.status}` };
    }

    const html = await response.text();
    // Match <meta name="agentstate-verification" content="..."> in either attribute order
    const pattern =
      /<meta\s+(?:[^>]*?\s)?name\s*=\s*["']agentstate-verification["']\s+(?:[^>]*?\s)?content\s*=\s*["']([^"']+)["'][^>]*>/i;
    const match = html.match(pattern);

    if (!match) {
      // Try reversed attribute order: content before name
      const reversedPattern =
        /<meta\s+(?:[^>]*?\s)?content\s*=\s*["']([^"']+)["']\s+(?:[^>]*?\s)?name\s*=\s*["']agentstate-verification["'][^>]*>/i;
      const reversedMatch = html.match(reversedPattern);

      if (!reversedMatch) {
        return { method: "meta_tag", success: false, error: "Meta tag not found" };
      }

      const success = reversedMatch[1] === expectedToken;
      return { method: "meta_tag", success, error: success ? undefined : "Token mismatch in meta tag" };
    }

    const success = match[1] === expectedToken;
    return { method: "meta_tag", success, error: success ? undefined : "Token mismatch in meta tag" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Meta tag verification failed";
    return { method: "meta_tag", success: false, error: msg };
  }
}

/**
 * Run all three verification methods in parallel. Returns on first success.
 *
 * @returns The first successful result, or all failures if none succeed.
 */
export async function checkDomainVerification(
  domain: string,
  expectedToken: string,
): Promise<{ verified: boolean; results: VerificationCheckResult[] }> {
  const results = await Promise.all([
    verifyDnsTxt(domain, expectedToken),
    verifyHttpFile(domain, expectedToken),
    verifyMetaTag(domain, expectedToken),
  ]);

  const verified = results.some((r) => r.success);
  return { verified, results };
}
