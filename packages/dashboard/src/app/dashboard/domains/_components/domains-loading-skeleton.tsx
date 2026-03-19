"use client";

export function _DomainsLoadingSkeleton(): React.ReactElement {
  return (
    <div className="space-y-6">
      <div className="h-12 w-48 bg-muted/60 rounded animate-pulse" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-muted/40 rounded animate-pulse" />
        ))}
      </div>
    </div>
  );
}
