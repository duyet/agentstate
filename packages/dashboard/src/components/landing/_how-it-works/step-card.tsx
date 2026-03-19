import type { Step } from "./steps-data";

type StepCardProps = {
  step: Step;
};

export function StepCard({ step }: StepCardProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <span className="inline-block font-mono text-xs text-muted-foreground bg-accent rounded px-1.5 py-0.5 mb-4">
        {step.number}
      </span>
      <step.icon />
      <p className="text-sm font-medium mt-3">{step.label}</p>
      <p className="font-mono text-xs text-muted-foreground mt-1">{step.sublabel}</p>
    </div>
  );
}
