import { useCallback, useEffect, useState } from "react";

/**
 * Drop-in replacements for next/navigation hooks in the Astro port.
 *
 * The dashboard is a client-rendered SPA. These hooks mirror the subset of
 * next/navigation actually used across the codebase (usePathname for active-link
 * highlighting, useRouter().push for programmatic navigation, useSearchParams
 * for query params) so existing components import unchanged during the migration.
 */

export function usePathname(): string {
  const [pathname, setPathname] = useState<string>(() =>
    typeof window === "undefined" ? "" : window.location.pathname,
  );

  useEffect(() => {
    setPathname(window.location.pathname);
    const onChange = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", onChange);
    return () => window.removeEventListener("popstate", onChange);
  }, []);

  return pathname;
}

export function useRouter() {
  const push = useCallback((href: string) => {
    window.location.assign(href);
  }, []);
  const replace = useCallback((href: string) => {
    window.location.replace(href);
  }, []);
  const refresh = useCallback(() => {
    window.location.reload();
  }, []);
  return { push, replace, refresh };
}

export function useSearchParams(): URLSearchParams {
  const [searchParams, setSearchParams] = useState<URLSearchParams>(() =>
    typeof window === "undefined"
      ? new URLSearchParams()
      : new URLSearchParams(window.location.search),
  );

  useEffect(() => {
    setSearchParams(new URLSearchParams(window.location.search));
    const onChange = () => setSearchParams(new URLSearchParams(window.location.search));
    window.addEventListener("popstate", onChange);
    return () => window.removeEventListener("popstate", onChange);
  }, []);

  return searchParams;
}
