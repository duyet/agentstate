export async function hashApiKey(key: string): Promise<string> {
  const encoded = new TextEncoder().encode(key);
  const buffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
