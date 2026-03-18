"use client";

import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { CheckIcon, ChevronRightIcon } from "lucide-react";
import type * as React from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/** Creates simple wrapper components (no custom props) */
function createSimpleWrapper<P>(name: string, slot: string, Component: React.ComponentType<P>) {
  const Wrapper = ({ ...props }: P) => <Component data-slot={slot} {...props} />;
  Wrapper.displayName = name;
  return Wrapper;
}

/** Creates styled components with className merging and data-inset support */
function createStyledComponent<P extends { className?: string; [key: string]: unknown }>(
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
function createIndicatorItem(
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

// ============================================================================
// SIMPLE WRAPPERS
// ============================================================================

const DropdownMenu = createSimpleWrapper("DropdownMenu", "dropdown-menu", MenuPrimitive.Root);
const DropdownMenuPortal = createSimpleWrapper(
  "DropdownMenuPortal",
  "dropdown-menu-portal",
  MenuPrimitive.Portal,
);
const DropdownMenuTrigger = createSimpleWrapper(
  "DropdownMenuTrigger",
  "dropdown-menu-trigger",
  MenuPrimitive.Trigger,
);
const DropdownMenuGroup = createSimpleWrapper(
  "DropdownMenuGroup",
  "dropdown-menu-group",
  MenuPrimitive.Group,
);
const DropdownMenuSub = createSimpleWrapper(
  "DropdownMenuSub",
  "dropdown-menu-sub",
  MenuPrimitive.SubmenuRoot,
);
const DropdownMenuRadioGroup = createSimpleWrapper(
  "DropdownMenuRadioGroup",
  "dropdown-menu-radio-group",
  MenuPrimitive.RadioGroup,
);

// ============================================================================
// CONTENT COMPONENTS
// ============================================================================

function DropdownMenuContent({
  align = "start",
  alignOffset = 0,
  side = "bottom",
  sideOffset = 4,
  className,
  ...props
}: MenuPrimitive.Popup.Props &
  Pick<MenuPrimitive.Positioner.Props, "align" | "alignOffset" | "side" | "sideOffset">) {
  const POPUP_BASE =
    "z-50 max-h-(--available-height) w-(--anchor-width) min-w-32 origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 outline-none data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:overflow-hidden data-closed:fade-out-0 data-closed:zoom-out-95";

  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        className="isolate z-50 outline-none"
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
      >
        <MenuPrimitive.Popup
          data-slot="dropdown-menu-content"
          className={cn(POPUP_BASE, className)}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}

// ============================================================================
// MENU ITEMS
// ============================================================================

const DropdownMenuLabel = createStyledComponent(
  "DropdownMenuLabel",
  "dropdown-menu-label",
  "px-1.5 py-1 text-xs font-medium text-muted-foreground data-inset:pl-7",
  MenuPrimitive.GroupLabel,
);

function DropdownMenuItem({
  className,
  inset,
  variant = "default",
  ...props
}: MenuPrimitive.Item.Props & {
  inset?: boolean;
  variant?: "default" | "destructive";
}) {
  const ITEM_BASE =
    "group/dropdown-menu-item relative flex cursor-default items-center gap-1.5 rounded-md px-1.5 py-1 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground data-inset:pl-7 data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 data-[variant=destructive]:focus:text-destructive dark:data-[variant=destructive]:focus:bg-destructive/20 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 data-[variant=destructive]:*:[svg]:text-destructive";

  return (
    <MenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(ITEM_BASE, className)}
      {...props}
    />
  );
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: MenuPrimitive.SubmenuTrigger.Props & {
  inset?: boolean;
}) {
  const SUB_TRIGGER_BASE =
    "flex cursor-default items-center gap-1.5 rounded-md px-1.5 py-1 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground data-inset:pl-7 data-popup-open:bg-accent data-popup-open:text-accent-foreground data-open:bg-accent data-open:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4";

  return (
    <MenuPrimitive.SubmenuTrigger
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset}
      className={cn(SUB_TRIGGER_BASE, className)}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ml-auto" />
    </MenuPrimitive.SubmenuTrigger>
  );
}

function DropdownMenuSubContent({
  align = "start",
  alignOffset = -3,
  side = "right",
  sideOffset = 0,
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuContent>) {
  const SUB_CONTENT_BASE =
    "w-auto min-w-[96px] rounded-lg bg-popover p-1 text-popover-foreground shadow-lg ring-1 ring-foreground/10 duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95";

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
// CHECKBOX & RADIO ITEMS
// ============================================================================

const DropdownMenuCheckboxItem = createIndicatorItem(
  "DropdownMenuCheckboxItem",
  "dropdown-menu-checkbox-item",
  MenuPrimitive.CheckboxItem,
  MenuPrimitive.CheckboxItemIndicator,
);

const DropdownMenuRadioItem = createIndicatorItem(
  "DropdownMenuRadioItem",
  "dropdown-menu-radio-item",
  MenuPrimitive.RadioItem,
  MenuPrimitive.RadioItemIndicator,
);

// ============================================================================
// SEPARATOR & SHORTCUT
// ============================================================================

const DropdownMenuSeparator = createStyledComponent(
  "DropdownMenuSeparator",
  "dropdown-menu-separator",
  "-mx-1 my-1 h-px bg-border",
  MenuPrimitive.Separator,
);

function DropdownMenuShortcut({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn(
        "ml-auto text-xs tracking-widest text-muted-foreground group-focus/dropdown-menu-item:text-accent-foreground",
        className,
      )}
      {...props}
    />
  );
}

export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
};
