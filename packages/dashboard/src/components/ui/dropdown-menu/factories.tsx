import { CheckIcon } from "lucide-react";
import type * as React from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/** Creates simple wrapper components (no custom props) */
export function createSimpleWrapper<P>(
  name: string,
  slot: string,
  Component: React.ComponentType<P>,
) {
  const Wrapper = ({ ...props }: P) => <Component data-slot={slot} {...props} />;
  Wrapper.displayName = name;
  return Wrapper;
}

/** Creates styled components with className merging and data-inset support */
export function createStyledComponent<P extends { className?: string; [key: string]: unknown }>(
  name: string,
  slot: string,
  baseClass: string,
  Component: React.ComponentType<P>,
) {
  const Styled = ({ className, inset, ...props }: P & { inset?: boolean }) => (
    <Component
      data-slot={slot}
      data-inset={inset}
      className={cn(baseClass, className)}
      {...(props as any)}
    />
  );
  Styled.displayName = name;
  return Styled;
}

/** Creates menu items with indicators (checkbox/radio) */
export function createIndicatorItem(
  name: string,
  slot: string,
  Component: React.ComponentType<any>,
  IndicatorComponent: React.ComponentType<{ children: React.ReactNode }>,
) {
  const CHECK_RADIO_BASE =
    "relative flex cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground data-inset:pl-7 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4";

  const Item = ({
    className,
    inset,
    children,
    ...props
  }: {
    className?: string;
    inset?: boolean;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <Component
      data-slot={slot}
      data-inset={inset}
      className={cn(CHECK_RADIO_BASE, className)}
      {...props}
    >
      <span
        className="pointer-events-none absolute right-2 flex items-center justify-center"
        data-slot={`${slot}-indicator`}
      >
        <IndicatorComponent>
          <CheckIcon />
        </IndicatorComponent>
      </span>
      {children}
    </Component>
  );
  Item.displayName = name;
  return Item;
}
