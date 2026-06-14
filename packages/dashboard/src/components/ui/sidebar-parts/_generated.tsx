import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { SidebarEl, SidebarRenderEl, SidebarWrap } from "./_factories";

export const SidebarInput = SidebarWrap(Input, "input", "h-8 w-full bg-background shadow-none");
export const SidebarSeparator = SidebarWrap(
  Separator,
  "separator",
  "mx-2 w-auto bg-sidebar-border",
);

export const SidebarInset = SidebarEl(
  "main",
  "inset",
  "relative flex w-full flex-1 flex-col bg-background md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow-sm md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-2",
);
export const SidebarHeader = SidebarEl("div", "header", "flex flex-col gap-2 p-2");
export const SidebarFooter = SidebarEl("div", "footer", "flex flex-col gap-2 p-2");
export const SidebarContent = SidebarEl(
  "div",
  "content",
  "no-scrollbar flex min-h-0 flex-1 flex-col gap-0 overflow-auto group-data-[collapsible=icon]:overflow-hidden",
);
export const SidebarGroup = SidebarEl("div", "group", "relative flex w-full min-w-0 flex-col p-2");
export const SidebarGroupLabel = SidebarRenderEl(
  "div",
  "group-label",
  "flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70 ring-sidebar-ring outline-hidden transition-[margin,opacity] duration-200 ease-linear group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0 focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
);
export const SidebarGroupAction = SidebarRenderEl(
  "button",
  "group-action",
  "absolute top-3.5 right-3 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground ring-sidebar-ring outline-hidden transition-transform group-data-[collapsible=icon]:hidden after:absolute after:-inset-2 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 md:after:hidden [&>svg]:size-4 [&>svg]:shrink-0",
);
export const SidebarGroupContent = SidebarEl("div", "group-content", "w-full text-sm");
