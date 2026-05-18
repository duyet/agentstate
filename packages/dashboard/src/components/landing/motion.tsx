import {
  div as MotionDiv,
  header as MotionHeader,
  section as MotionSection,
} from "motion/react-client";

export { MotionDiv, MotionHeader, MotionSection };

export const landingContainer = {
  hidden: {},
  visible: {
    transition: {
      delayChildren: 0.05,
      staggerChildren: 0.08,
    },
  },
};

export const landingItem = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, duration: 0.42, bounce: 0 },
  },
};

export const landingCard = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, duration: 0.42, bounce: 0 },
  },
};

export const landingHover = {
  y: -3,
  transition: { type: "spring" as const, duration: 0.3, bounce: 0 },
};
