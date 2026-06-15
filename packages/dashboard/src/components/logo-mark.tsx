/** AgentState mark — three stacked "state layers" with ascending weight.
 *  React version (for client islands). Mirrors logo.astro. */
export function LogoMark({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      focusable={false}
    >
      <rect x="3" y="4" width="18" height="4" rx="2" fill="currentColor" fillOpacity={0.35} />
      <rect x="3" y="10" width="18" height="4" rx="2" fill="currentColor" fillOpacity={0.65} />
      <rect x="3" y="16" width="18" height="4" rx="2" fill="currentColor" />
    </svg>
  );
}
