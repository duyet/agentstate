import type { AnchorHTMLAttributes, ReactNode } from "react";

/**
 * Drop-in replacement for next/link in the Astro port.
 *
 * The dashboard is a statically-exported SPA served as plain files, so client
 * navigation is a full page load anyway. next/link added no value beyond an
 * <a> tag (no prefetch benefit for same-origin static routes here). This shim
 * keeps the call sites unchanged (href + className + children) while rendering
 * a plain anchor.
 */
type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  children?: ReactNode;
};

export function Link({ href, children, ...rest }: LinkProps) {
  return (
    <a href={href} {...rest}>
      {children}
    </a>
  );
}

export default Link;
