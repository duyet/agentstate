import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import * as React from "react";
import { cn } from "@/lib/utils";

// Unified factory: creates sidebar elements with data attributes and className merging
export function SidebarEl<T extends keyof React.JSX.IntrinsicElements>(
  tag: T,
  slot: string,
  baseClassName: string,
): React.FC<React.ComponentProps<T>> {
  return ({ className, ...props }) =>
    React.createElement(tag, {
      "data-slot": `sidebar-${slot}`,
      "data-sidebar": slot,
      className: cn(baseClassName, className),
      ...props,
    });
}

// Factory for useRender sidebar components (dynamic tag rendering)
export function SidebarRenderEl<T extends keyof React.JSX.IntrinsicElements>(
  defaultTagName: T,
  slot: string,
  baseClassName: string,
): React.FC<useRender.ComponentProps<T> & React.ComponentProps<T>> {
  return ({ className, render, ...props }) =>
    useRender({
      defaultTagName,
      props: mergeProps({ className: cn(baseClassName, className) }, props),
      render,
      state: { slot: `sidebar-${slot}`, sidebar: slot },
    });
}

// Variant factory for size-based className variants (exported for use by sidebar-menu)
export function SidebarVariantEl<T extends keyof React.JSX.IntrinsicElements>(
  defaultTagName: T,
  slot: string,
  baseClassNames: Record<string, string>,
): React.FC<useRender.ComponentProps<T> & React.ComponentProps<T> & { size?: string }> {
  return ({ className, render, size = "md", ...props }) =>
    useRender({
      defaultTagName,
      props: mergeProps(
        {
          className: cn(baseClassNames.base, baseClassNames[size] || baseClassNames.md, className),
        },
        props,
      ),
      render,
      state: { slot: `sidebar-${slot}`, sidebar: slot, size },
    });
}

// Factory for wrapping existing components (Input, Separator, etc.)
export const SidebarWrap =
  <T extends React.ComponentType<any>>(
    Component: T,
    slot: string,
    baseClassName: string,
  ): React.FC<React.ComponentProps<T>> =>
  ({ className, ...props }) =>
    React.createElement(Component, {
      "data-slot": `sidebar-${slot}`,
      "data-sidebar": slot,
      className: cn(baseClassName, className),
      ...props,
    });
