import { EnvelopeIcon, type Icon, UserIcon } from "@phosphor-icons/react";

export interface AvatarIconProps {
  readonly icon: "user" | "mail";
}

export function AvatarIcon({ icon }: AvatarIconProps) {
  const Icon: Icon = icon === "user" ? UserIcon : EnvelopeIcon;

  return (
    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
      <Icon className="size-4" aria-hidden="true" />
    </div>
  );
}
