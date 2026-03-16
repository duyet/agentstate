"use client";

export function HeroIllustration() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Large circle — top right */}
      <svg
        role="presentation"
        className="absolute -top-12 -right-16 w-64 h-64 opacity-[0.07] animate-float"
        viewBox="0 0 200 200"
      >
        <circle cx="100" cy="100" r="90" fill="currentColor" />
      </svg>

      {/* Small circle — left */}
      <svg
        role="presentation"
        className="absolute top-1/3 -left-8 w-24 h-24 opacity-[0.06] animate-float-delayed"
        viewBox="0 0 100 100"
      >
        <circle cx="50" cy="50" r="40" fill="currentColor" />
      </svg>

      {/* Rounded rect — bottom right */}
      <svg
        role="presentation"
        className="absolute bottom-8 right-12 w-40 h-28 opacity-[0.05] animate-float-slow"
        viewBox="0 0 160 112"
      >
        <rect x="10" y="10" width="140" height="92" rx="20" fill="currentColor" />
      </svg>

      {/* Connection line — dashed path from top-left to center */}
      <svg
        role="presentation"
        className="absolute top-16 left-1/4 w-48 h-48 opacity-[0.08]"
        viewBox="0 0 200 200"
        fill="none"
      >
        <path
          d="M10 180 Q 60 60, 180 30"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="6 4"
          className="animate-draw-line"
        />
        <circle cx="180" cy="30" r="5" fill="currentColor" className="animate-pulse-soft" />
      </svg>

      {/* Small dots cluster — mid right */}
      <svg
        role="presentation"
        className="absolute top-1/2 right-1/4 w-32 h-32 opacity-[0.06] animate-float-delayed"
        viewBox="0 0 100 100"
      >
        <circle cx="20" cy="30" r="4" fill="currentColor" />
        <circle cx="50" cy="15" r="3" fill="currentColor" />
        <circle cx="75" cy="45" r="5" fill="currentColor" />
        <circle cx="40" cy="70" r="3.5" fill="currentColor" />
        <circle cx="80" cy="80" r="4" fill="currentColor" />
      </svg>

      {/* Rounded rect — top center */}
      <svg
        role="presentation"
        className="absolute -top-4 left-1/2 w-20 h-20 opacity-[0.04] animate-float-slow"
        viewBox="0 0 80 80"
      >
        <rect x="10" y="10" width="60" height="60" rx="14" fill="currentColor" />
      </svg>
    </div>
  );
}
