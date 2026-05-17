"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";

type LandingMotionConfigProps = {
  children: ReactNode;
};

export function LandingMotionConfig({ children }: LandingMotionConfigProps) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
