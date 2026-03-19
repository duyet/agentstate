"use client";

import { ConnectingArrow, StepCard, steps } from "./_how-it-works";

export function HowItWorks() {
  return (
    <section
      className="max-w-5xl mx-auto px-6 pb-28 animate-fade-in-up"
      style={{ animationDelay: "0.2s" }}
    >
      <h2 className="text-lg font-medium mb-5">How it works</h2>
      <div className="relative grid sm:grid-cols-3 gap-5">
        {steps.map((step) => (
          <StepCard key={step.number} step={step} />
        ))}

        {/* Connecting arrows — desktop only */}
        <ConnectingArrow position="left" />
        <ConnectingArrow position="right" />
      </div>
    </section>
  );
}
