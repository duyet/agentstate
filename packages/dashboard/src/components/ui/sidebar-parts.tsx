"use client";

import type * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { SIDEBAR_WIDTH_MOBILE, useSidebar } from "./sidebar-core";

// Export factory functions for sidebar-menu
export { SidebarEl, SidebarRenderEl, SidebarVariantEl } from "./sidebar-parts/_factories";

import {
  CONTAINER_BASE_CLASS,
  FLOATING_ICON_CONTAINER,
  FLOATING_ICON_GAP,
  INNER_CLASS,
  STANDARD_ICON_CONTAINER,
  STANDARD_ICON_GAP,
  STATIC_SIDEBAR_CLASS,
} from "./sidebar-parts/_constants";
import {
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarSeparator,
} from "./sidebar-parts/_generated";
import { SidebarRail, SidebarTrigger } from "./sidebar-parts/_interactive";

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
      <div data-slot="sidebar-gap" className={cn(iconGapClass)} />
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
