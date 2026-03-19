"use client";

/**
 * Slug validation utilities.
 */

import { useEffect, useState } from "react";

/**
 * Regular expression for validating slug format.
 *
 * Slugs must:
 * - Contain only lowercase letters, numbers, and hyphens
 * - Start and end with alphanumeric characters
 * - Be at least 1 character long
 */
export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Slug availability status.
 */
export type SlugStatus = "idle" | "checking" | "available" | "taken";

/**
 * Validates a slug format.
 *
 * @param slug - The slug string to validate
 * @returns `true` if the slug format is valid, `false` otherwise
 *
 * @example
 * ```ts
 * isValidSlug("my-project"); // true
 * isValidSlug("my-project-123"); // true
 * isValidSlug("My-Project"); // false (uppercase)
 * isValidSlug("my-project-"); // false (trailing hyphen)
 * isValidSlug("-my-project"); // false (leading hyphen)
 * isValidSlug("my--project"); // false (consecutive hyphens)
 * ```
 */
export function isValidSlug(slug: string): boolean {
  return SLUG_REGEX.test(slug);
}

/**
 * Custom hook for checking slug availability with debounce.
 *
 * This hook provides real-time slug availability checking with built-in debouncing
 * to avoid excessive checks while the user is typing.
 *
 * @param slug - The slug to check
 * @param existingSlugs - Array of existing slugs to check against
 * @param debounceMs - Debounce delay in milliseconds (default: 300ms)
 * @returns The current availability status of the slug
 *
 * @example
 * ```tsx
 * const slugStatus = useSlugAvailability(newSlug, existingSlugs);
 *
 * {slugStatus === "available" && <CheckCircle className="text-green-500" />}
 * {slugStatus === "taken" && <XCircle className="text-red-500" />}
 * {slugStatus === "checking" && <Loader />}
 * ```
 */
export function useSlugAvailability(
  slug: string,
  existingSlugs: string[],
  debounceMs: number = 300,
): SlugStatus {
  const [status, setStatus] = useState<SlugStatus>("idle");

  useEffect(() => {
    if (!slug) {
      setStatus("idle");
      return;
    }

    setStatus("checking");

    const timer = setTimeout(() => {
      const taken = existingSlugs.includes(slug);
      setStatus(taken ? "taken" : "available");
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [slug, existingSlugs, debounceMs]);

  return status;
}
