// ---------------------------------------------------------------------------
// URL safety — SSRF guards for user-supplied outbound URLs (webhooks)
// ---------------------------------------------------------------------------
//
// Webhook URLs are user-controlled and are fetched server-side, so they are a
// classic SSRF vector. We enforce two rules, both at registration time and
// again immediately before delivery (defense in depth):
//
//   1. The scheme MUST be https.
//   2. The host MUST NOT be a loopback / private / link-local / cloud-metadata
//      address, nor "localhost".
//
// This is a *literal-address* check: it blocks URLs whose host is already an
// IP in a blocked range (or localhost). It cannot stop a public hostname that
// resolves (or is rebound) to a private IP — that requires resolve-then-pin at
// fetch time, which the Workers runtime does not expose. Blocking the literal
// ranges removes the trivial exploit paths (127.0.0.1, 169.254.169.254, etc.).

/** Parse a dotted-quad IPv4 literal into its four octets, or null if not IPv4. */
function parseIPv4(host: string): [number, number, number, number] | null {
  const parts = host.split(".");
  if (parts.length !== 4) return null;
  const octets: number[] = [];
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const n = Number(part);
    if (n < 0 || n > 255) return null;
    octets.push(n);
  }
  return octets as [number, number, number, number];
}

/** Is an IPv4 literal in a loopback / private / link-local / unspecified range? */
function isBlockedIPv4(octets: [number, number, number, number]): boolean {
  const [a, b] = octets;
  if (a === 0) return true; // 0.0.0.0/8 (includes unspecified)
  if (a === 127) return true; // 127.0.0.0/8 loopback
  if (a === 10) return true; // 10.0.0.0/8 private
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 private
  if (a === 192 && b === 168) return true; // 192.168.0.0/16 private
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local (+ metadata)
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT (RFC 6598)
  return false;
}

/**
 * Is an IPv6 host (as URL.hostname returns it — no brackets) in a blocked
 * range: ::1 loopback, :: unspecified, fc00::/7 unique-local, fe80::/10
 * link-local, or an IPv4-mapped address whose embedded v4 is blocked.
 */
function isBlockedIPv6(host: string): boolean {
  const h = host.toLowerCase();
  if (h === "::1" || h === "::") return true;

  // IPv4-mapped / -translated (e.g. ::ffff:127.0.0.1) — inspect the embedded v4.
  const mapped = h.match(/:((?:\d{1,3}\.){3}\d{1,3})$/);
  if (mapped) {
    const v4 = parseIPv4(mapped[1]);
    if (v4 && isBlockedIPv4(v4)) return true;
  }

  const firstHextet = h.split(":")[0];
  if (firstHextet.length > 0) {
    // fc00::/7 → first byte 0xfc or 0xfd; fe80::/10 link-local (fe80..febf) and
    // fec0::/10 site-local (fec0..feff) together span fe80..feff → /^fe[8-f]/.
    if (firstHextet.startsWith("fc") || firstHextet.startsWith("fd")) return true;
    if (/^fe[8-f]/.test(firstHextet)) return true;
  }
  return false;
}

/** Is `hostname` a blocked host (localhost or a private/loopback/link-local IP)? */
export function isBlockedWebhookHost(hostname: string): boolean {
  let host = hostname.toLowerCase().trim();
  if (host.length === 0) return true;
  // URL.hostname keeps IPv6 without brackets, but be defensive.
  if (host.startsWith("[") && host.endsWith("]")) host = host.slice(1, -1);

  if (host === "localhost" || host.endsWith(".localhost")) return true;

  const v4 = parseIPv4(host);
  if (v4) return isBlockedIPv4(v4);

  if (host.includes(":")) return isBlockedIPv6(host);

  return false;
}

/**
 * Is `raw` a webhook URL that is safe to register and deliver to?
 * Requires an https URL whose host is not blocked (see {@link isBlockedWebhookHost}).
 */
export function isSafeWebhookUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  return !isBlockedWebhookHost(url.hostname);
}
