type ConnectingArrowProps = {
  position: "left" | "right";
};

export function ConnectingArrow({ position }: ConnectingArrowProps) {
  const left = position === "left" ? "calc(33.333% - 10px)" : "calc(66.666% - 10px)";

  return (
    <svg
      role="presentation"
      aria-hidden="true"
      className="hidden sm:block absolute top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground"
      style={{ left }}
      viewBox="0 0 60 20"
      fill="none"
    >
      <path
        d="M0,10 L60,10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="6 4"
        opacity="0.4"
      />
      <circle r="2.5" fill="currentColor" opacity="0.4">
        <animateMotion dur="2s" repeatCount="indefinite" path="M0,10 L60,10" />
      </circle>
    </svg>
  );
}
