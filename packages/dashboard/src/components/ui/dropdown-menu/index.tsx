"use client";

import { Menu } from "@base-ui/react/menu";
import { ChevronRightIcon } from "lucide-react";
import type * as React from "react";
import { cn } from "@/lib/utils";
import {
  ITEM_BASE,
  POPUP_BASE,
  SHORTCUT_BASE,
  SUB_CONTENT_BASE,
  SUB_TRIGGER_BASE,
} from "./constants";

// Re-export all components
export * from "./components";

// ============================================================================
// CONTENT COMPONENTS
// ============================================================================

export function DropdownMenuContent({
  align = "start",
  alignOffset = 0,
  side = "bottom",
  sideOffset = 4,
  className,
  ...props
}: Menu.Popup.Props &
  Pick<Menu.Positioner.Props, "align" | "alignOffset" | "side" | "sideOffset">) {
  return (
    <Menu.Portal>
      <Menu.Positioner
        className="isolate z-50 outline-none"
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
      >
        <Menu.Popup
          data-slot="dropdown-menu-content"
          className={cn(POPUP_BASE, className)}
          {...props}
        />
      </Menu.Positioner>
    </Menu.Portal>
  );
}

// ============================================================================
// MENU ITEMS
// ============================================================================

export function DropdownMenuItem({
  className,
  inset,
  variant = "default",
  ...props
}: Menu.Item.Props & {
  inset?: boolean;
  variant?: "default" | "destructive";
}) {
  return (
    <Menu.Item
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(ITEM_BASE, className)}
      {...props}
    />
  );
}

export function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: Menu.SubmenuTrigger.Props & {
  inset?: boolean;
}) {
  return (
    <Menu.SubmenuTrigger
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset}
      className={cn(SUB_TRIGGER_BASE, className)}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ml-auto" />
    </Menu.SubmenuTrigger>
  );
}

export function DropdownMenuSubContent({
  align = "start",
  alignOffset = -3,
  side = "right",
  sideOffset = 0,
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuContent>) {
  return (
    <DropdownMenuContent
      data-slot="dropdown-menu-sub-content"
      className={cn(SUB_CONTENT_BASE, className)}
      align={align}
      alignOffset={alignOffset}
      side={side}
      sideOffset={sideOffset}
      {...props}
    />
  );
}

// ============================================================================
// SHORTCUT
// ============================================================================

export function DropdownMenuShortcut({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span data-slot="dropdown-menu-shortcut" className={cn(SHORTCUT_BASE, className)} {...props} />
  );
}
