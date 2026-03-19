"use client";

import { Menu } from "@base-ui/react/menu";
import { LABEL_BASE, SEPARATOR_BASE } from "./constants";
import { createIndicatorItem, createSimpleWrapper, createStyledComponent } from "./factories";

// ============================================================================
// SIMPLE WRAPPERS
// ============================================================================

export const DropdownMenu = createSimpleWrapper("DropdownMenu", "dropdown-menu", Menu.Root);
export const DropdownMenuPortal = createSimpleWrapper(
  "DropdownMenuPortal",
  "dropdown-menu-portal",
  Menu.Portal,
);
export const DropdownMenuTrigger = createSimpleWrapper(
  "DropdownMenuTrigger",
  "dropdown-menu-trigger",
  Menu.Trigger,
);
export const DropdownMenuGroup = createSimpleWrapper(
  "DropdownMenuGroup",
  "dropdown-menu-group",
  Menu.Group,
);
export const DropdownMenuSub = createSimpleWrapper(
  "DropdownMenuSub",
  "dropdown-menu-sub",
  Menu.SubmenuRoot,
);
export const DropdownMenuRadioGroup = createSimpleWrapper(
  "DropdownMenuRadioGroup",
  "dropdown-menu-radio-group",
  Menu.RadioGroup,
);

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

export const DropdownMenuLabel = createStyledComponent(
  "DropdownMenuLabel",
  "dropdown-menu-label",
  LABEL_BASE,
  Menu.GroupLabel,
);

export const DropdownMenuSeparator = createStyledComponent(
  "DropdownMenuSeparator",
  "dropdown-menu-separator",
  SEPARATOR_BASE,
  Menu.Separator,
);

export const DropdownMenuCheckboxItem = createIndicatorItem(
  "DropdownMenuCheckboxItem",
  "dropdown-menu-checkbox-item",
  Menu.CheckboxItem,
  Menu.CheckboxItemIndicator,
);

export const DropdownMenuRadioItem = createIndicatorItem(
  "DropdownMenuRadioItem",
  "dropdown-menu-radio-item",
  Menu.RadioItem,
  Menu.RadioItemIndicator,
);
