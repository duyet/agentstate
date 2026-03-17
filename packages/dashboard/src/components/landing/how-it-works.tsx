"use client";

const steps = [
  {
    number: 1,
    label: "Your agent sends a request",
    sublabel: "POST /v1/conversations",
    icon: SendIcon,
  },
  {
    number: 2,
    label: "AgentState stores the conversation",
    sublabel: "Messages, metadata, tokens",
    icon: StoreIcon,
  },
  {
    number: 3,
    label: "Retrieve history anytime",
    sublabel: "GET /v1/conversations/:id",
    icon: RetrieveIcon,
  },
] as const;

export function HowItWorks() {
  return (
    <section
      className="max-w-5xl mx-auto px-6 pb-28 animate-fade-in-up"
      style={{ animationDelay: "0.2s" }}
    >
      <h2 className="text-lg font-medium mb-5">How it works</h2>
      <div className="relative grid sm:grid-cols-3 gap-5">
        {steps.map((step) => (
          <div key={step.number} className="bg-card border border-border rounded-lg p-6">
            <span className="inline-block font-mono text-xs text-muted-foreground bg-accent rounded px-1.5 py-0.5 mb-4">
              {step.number}
            </span>
            <step.icon />
            <p className="text-sm font-medium mt-3">{step.label}</p>
            <p className="font-mono text-xs text-muted-foreground mt-1">{step.sublabel}</p>
          </div>
        ))}

        {/* Connecting arrows — desktop only */}
        <ConnectingArrow position="left" />
        <ConnectingArrow position="right" />
      </div>
    </section>
  );
}

function ConnectingArrow({ position }: { position: "left" | "right" }) {
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

function SendIcon() {
  return (
    <svg
      aria-hidden="true"
      role="presentation"
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-12 h-12 text-muted-foreground"
    >
      {/* Agent box */}
      <rect x="4" y="12" width="22" height="24" rx="4" />
      {/* Message lines inside box */}
      <line x1="10" y1="20" x2="20" y2="20" />
      <line x1="10" y1="25" x2="18" y2="25" />
      <line x1="10" y1="30" x2="16" y2="30" />
      {/* Arrow leaving the box */}
      <path d="M30 24 L42 24" />
      <path d="M38 19 L43 24 L38 29" className="animate-pulse-soft" />
    </svg>
  );
}

function StoreIcon() {
  return (
    <svg
      aria-hidden="true"
      role="presentation"
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-12 h-12 text-muted-foreground"
    >
      {/* Database cylinder */}
      <ellipse cx="24" cy="12" rx="14" ry="5" className="animate-pulse-soft" />
      <path d="M38 12v12c0 2.761-6.268 5-14 5S10 26.761 10 24V12" />
      <path d="M38 24v12c0 2.761-6.268 5-14 5s-14-2.239-14-5V24" />
      {/* Message lines inside cylinder */}
      <line x1="17" y1="22" x2="27" y2="22" opacity="0.5" />
      <line x1="19" y1="26" x2="29" y2="26" opacity="0.5" />
      <line x1="17" y1="34" x2="25" y2="34" opacity="0.5" />
    </svg>
  );
}

function RetrieveIcon() {
  return (
    <svg
      aria-hidden="true"
      role="presentation"
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-12 h-12 text-muted-foreground"
    >
      {/* Arrow entering */}
      <path d="M6 24 L16 24" />
      <path d="M6 24 L11 19" className="animate-pulse-soft" />
      <path d="M6 24 L11 29" className="animate-pulse-soft" />
      {/* Rounded rect with chat bubbles */}
      <rect x="20" y="10" width="24" height="28" rx="4" />
      {/* Chat bubble - user */}
      <rect x="24" y="16" width="12" height="6" rx="2" opacity="0.5" />
      {/* Chat bubble - assistant */}
      <rect x="28" y="26" width="12" height="6" rx="2" opacity="0.5" />
    </svg>
  );
}
