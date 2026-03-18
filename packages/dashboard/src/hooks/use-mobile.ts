import * as React from "react";

const MOBILE_BREAKPOINT = 768;

function createMobileListener(breakpoint: number, setIsMobile: (mobile: boolean) => void) {
  const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
  const onChange = () => {
    setIsMobile(window.innerWidth < breakpoint);
  };
  mql.addEventListener("change", onChange);
  setIsMobile(window.innerWidth < breakpoint);
  return () => mql.removeEventListener("change", onChange);
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => createMobileListener(MOBILE_BREAKPOINT, setIsMobile), []);

  return !!isMobile;
}
