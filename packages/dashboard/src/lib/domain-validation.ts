/**
 * Domain validation utilities.
 */

/**
 * Regular expression for validating domain names.
 *
 * Based on RFC 1035 and RFC 1123:
 * - Labels must start and end with alphanumeric characters
 * - Labels can contain hyphens in the middle
 * - Labels are separated by dots
 * - Each label is 1-63 characters
 */
export const DOMAIN_REGEX =
  /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/**
 * Validates a domain name format.
 *
 * @param domain - The domain string to validate (whitespace will be trimmed)
 * @returns `true` if the domain format is valid, `false` otherwise
 *
 * @example
 * ```ts
 * isValidDomain("example.com"); // true
 * isValidDomain("sub.example.com"); // true
 * isValidDomain("invalid-domain-"); // false
 * isValidDomain("example..com"); // false
 * ```
 */
export function isValidDomain(domain: string): boolean {
  return DOMAIN_REGEX.test(domain.trim());
}
