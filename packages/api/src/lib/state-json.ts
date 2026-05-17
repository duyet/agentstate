export function encodeJson(value: unknown): string {
  return JSON.stringify(value ?? null);
}

export function decodeJson<T = unknown>(value: string | null | undefined, fallback: T): T {
  if (value === null || value === undefined || value === "") return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

const JSON_PATH_PATTERN = /^(\$)(\.[A-Za-z_][A-Za-z0-9_]*|\[[0-9]+\])*$/;

export function isSupportedJsonPath(path: string): boolean {
  return JSON_PATH_PATTERN.test(path);
}

export function readJsonPath(value: unknown, path: string): unknown {
  if (!isSupportedJsonPath(path)) return undefined;
  let current = value;
  const tokens = path.slice(1).match(/(\.[A-Za-z_][A-Za-z0-9_]*|\[[0-9]+\])/g) ?? [];

  for (const token of tokens) {
    if (token.startsWith(".")) {
      const key = token.slice(1);
      if (!current || typeof current !== "object" || Array.isArray(current)) return undefined;
      current = (current as Record<string, unknown>)[key];
      continue;
    }

    const index = Number(token.slice(1, -1));
    if (!Array.isArray(current)) return undefined;
    current = current[index];
  }

  return current;
}

export async function sha256Hex(value: string): Promise<string> {
  const encoded = new TextEncoder().encode(value);
  const buffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
