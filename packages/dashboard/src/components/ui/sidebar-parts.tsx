"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { PanelLeftIcon } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { SIDEBAR_WIDTH_MOBILE, useSidebar } from "./sidebar-core";

const STATIC_SIDEBAR_CLASS =
  "flex h-full w-(--sidebar-width) flex-col bg-sidebar text-sidebar-foreground";
const GAP_BASE_CLASS =
  "relative w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-linear group-data-[collapsible=offcanvas]:w-0 group-data-[side=right]:rotate-180";
const CONTAINER_BASE_CLASS =
  "fixed inset-y-0 z-10 hidden h-svh w-(--sidebar-width) transition-[left,right,width] duration-200 ease-linear data-[side=left]:left-0 data-[side=left]:group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)] data-[side=right]:right-0 data-[side=right]:group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)] md:flex";
const INNER_CLASS =
  "flex size-full flex-col bg-sidebar group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:shadow-sm group-data-[variant=floating]:ring-1 group-data-[variant=floating]:ring-sidebar-border";
const FLOATING_ICON_GAP =
  "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]";
const STANDARD_ICON_GAP = "group-data-[collapsible=icon]:w-(--sidebar-width-icon)";
const FLOATING_ICON_CONTAINER =
  "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]";
const STANDARD_ICON_CONTAINER =
  "group-data-[collapsible=icon]:w-(--sidebar-width-icon) group-data-[side=left]:border-r group-data-[side=right]:border-l";
const RAIL_BASE_CLASS =
  "absolute inset-y-0 z-20 hidden w-4 transition-all ease-linear group-data-[side=left]:-right-4 group-data-[side=right]:left-0 after:absolute after:inset-y-0 after:start-1/2 after:w-[2px] hover:after:bg-sidebar-border sm:flex ltr:-translate-x-1/2 rtl:-translate-x-1/2 in-data-[side=left]:cursor-w-resize in-data-[side=right]:cursor-e-resize [[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full hover:group-data-[collapsible=offcanvas]:bg-sidebar [[data-side=left][data-collapsible=offcanvas]_&]:-right-2 [[data-side=right][data-collapsible=offcanvas]_&]:-left-2";

function Sidebar({
  side = "left",
  variant = "sidebar",
  collapsible = "offcanvas",
  className,
  children,
  dir,
  ...props
}: React.ComponentProps<"div"> & {
  side?: "left" | "right";
  variant?: "sidebar" | "floating" | "inset";
  collapsible?: "offcanvas" | "icon" | "none";
}) {
  const { isMobile, state, openMobile, setOpenMobile } = useSidebar();
  const isFloating = variant === "floating" || variant === "inset";
  const iconGapClass = isFloating ? FLOATING_ICON_GAP : STANDARD_ICON_GAP;
  const iconContainerClass = isFloating ? FLOATING_ICON_CONTAINER : STANDARD_ICON_CONTAINER;

  if (collapsible === "none") {
    return (
      <div data-slot="sidebar" className={cn(STATIC_SIDEBAR_CLASS, className)} {...props}>
        {children}
      </div>
    );
  }
  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile} {...props}>
        <SheetContent
          dir={dir}
          data-sidebar="sidebar"
          data-slot="sidebar"
          data-mobile="true"
          className="w-(--sidebar-width) bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden"
          style={{ "--sidebar-width": SIDEBAR_WIDTH_MOBILE } as React.CSSProperties}
          side={side}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Sidebar</SheetTitle>
            <SheetDescription>Displays the mobile sidebar.</SheetDescription>
          </SheetHeader>
          <div className="flex h-full w-full flex-col">{children}</div>
        </SheetContent>
      </Sheet>
    );
  }
  return (
    <div
      className="group peer hidden text-sidebar-foreground md:block"
      data-state={state}
      data-collapsible={state === "collapsed" ? collapsible : ""}
      data-variant={variant}
      data-side={side}
      data-slot="sidebar"
    >
      <div data-slot="sidebar-gap" className={cn(GAP_BASE_CLASS, iconGapClass)} />
      <div
        data-slot="sidebar-container"
        data-side={side}
        className={cn(CONTAINER_BASE_CLASS, iconContainerClass, className)}
        {...props}
      >
        <div data-sidebar="sidebar" data-slot="sidebar-inner" className={INNER_CLASS}>
          {children}
        </div>
      </div>
    </div>
  );
}

const SidebarTrigger = ({ className, onClick, ...props }: React.ComponentProps<typeof Button>) => {
  const { toggleSidebar } = useSidebar();
  return (
    <Button
      data-sidebar="trigger"
      data-slot="sidebar-trigger"
      variant="ghost"
      size="icon-sm"
      className={className}
      onClick={(e) => {
        onClick?.(e);
        toggleSidebar();
      }}
      {...props}
    >
      <PanelLeftIcon />
      <span className="sr-only">Toggle sidebar</span>
    </Button>
  );
};

const SidebarRail = ({ className, ...props }: React.ComponentProps<"button">) => {
  const { toggleSidebar } = useSidebar();
  return (
    <button
      data-sidebar="rail"
      data-slot="sidebar-rail"
      aria-label="Toggle sidebar"
      tabIndex={-1}
      onClick={toggleSidebar}
      className={cn(RAIL_BASE_CLASS, className)}
      {...props}
    />
  );
};

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
const SidebarWrap =
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

const SidebarInput = SidebarWrap(Input, "input", "h-8 w-full bg-background shadow-none");
const SidebarSeparator = SidebarWrap(Separator, "separator", "mx-2 w-auto bg-sidebar-border");

const SidebarInset = SidebarEl(
  "main",
  "inset",
  "relative flex w-full flex-1 flex-col bg-background md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow-sm md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-2",
);
const SidebarHeader = SidebarEl("div", "header", "flex flex-col gap-2 p-2");
const SidebarFooter = SidebarEl("div", "footer", "flex flex-col gap-2 p-2");
const SidebarContent = SidebarEl(
  "div",
  "content",
  "no-scrollbar flex min-h-0 flex-1 flex-col gap-0 overflow-auto group-data-[collapsible=icon]:overflow-hidden",
);
const SidebarGroup = SidebarEl("div", "group", "relative flex w-full min-w-0 flex-col p-2");
const SidebarGroupLabel = SidebarRenderEl(
  "div",
  "group-label",
  "flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70 ring-sidebar-ring outline-hidden transition-[margin,opacity] duration-200 ease-linear group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0 focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
);
const SidebarGroupAction = SidebarRenderEl(
  "button",
  "group-action",
  "absolute top-3.5 right-3 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground ring-sidebar-ring outline-hidden transition-transform group-data-[collapsible=icon]:hidden after:absolute after:-inset-2 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 md:after:hidden [&>svg]:size-4 [&>svg]:shrink-0",
);
const SidebarGroupContent = SidebarEl("div", "group-content", "w-full text-sm");

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
};
