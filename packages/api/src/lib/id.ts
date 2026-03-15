import { nanoid, customAlphabet } from "nanoid";

export function generateId(): string {
  return nanoid(21);
}

const BASE62 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const generateSecret = customAlphabet(BASE62, 40);

export function generateApiKey(): string {
  return `as_live_${generateSecret()}`;
}
