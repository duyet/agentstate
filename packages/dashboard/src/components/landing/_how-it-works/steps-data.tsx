import type { SVGProps } from "react";

export interface Step {
  number: 1 | 2 | 3;
  label: string;
  sublabel: string;
  icon: (props: SVGProps<SVGSVGElement>) => React.ReactElement;
}

function SendIcon(props: SVGProps<SVGSVGElement>) {
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
      {...props}
    >
      <rect x="4" y="12" width="22" height="24" rx="4" />
      <line x1="10" y1="20" x2="20" y2="20" />
      <line x1="10" y1="25" x2="18" y2="25" />
      <line x1="10" y1="30" x2="16" y2="30" />
      <path d="M30 24 L42 24" />
      <path d="M38 19 L43 24 L38 29" className="animate-pulse-soft" />
    </svg>
  );
}

function StoreIcon(props: SVGProps<SVGSVGElement>) {
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
      {...props}
    >
      <ellipse cx="24" cy="12" rx="14" ry="5" className="animate-pulse-soft" />
      <path d="M38 12v12c0 2.761-6.268 5-14 5S10 26.761 10 24V12" />
      <path d="M38 24v12c0 2.761-6.268 5-14 5s-14-2.239-14-5V24" />
      <line x1="17" y1="22" x2="27" y2="22" opacity="0.5" />
      <line x1="19" y1="26" x2="29" y2="26" opacity="0.5" />
      <line x1="17" y1="34" x2="25" y2="34" opacity="0.5" />
    </svg>
  );
}

function RetrieveIcon(props: SVGProps<SVGSVGElement>) {
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
      {...props}
    >
      <path d="M6 24 L16 24" />
      <path d="M6 24 L11 19" className="animate-pulse-soft" />
      <path d="M6 24 L11 29" className="animate-pulse-soft" />
      <rect x="20" y="10" width="24" height="28" rx="4" />
      <rect x="24" y="16" width="12" height="6" rx="2" opacity="0.5" />
      <rect x="28" y="26" width="12" height="6" rx="2" opacity="0.5" />
    </svg>
  );
}

export const steps: readonly Step[] = [
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
