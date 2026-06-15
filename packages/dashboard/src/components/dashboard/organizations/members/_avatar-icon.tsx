import { EnvelopeIcon, type Icon, UserIcon } from "@phosphor-icons/react";

export interface AvatarIconProps {
  readonly icon: "user" | "mail";
}

export function AvatarIcon({ icon }: AvatarIconProps) {
  const Icon: Icon = icon === "user" ? UserIcon : EnvelopeIcon;

  return (
    <span className="grid size-8 shrink-0 place-items-center rounded-[var(--radius)] border border-edge bg-panel2 text-fg-3">
      <Icon className="size-4" aria-hidden="true" />
    </span>
  );
}
