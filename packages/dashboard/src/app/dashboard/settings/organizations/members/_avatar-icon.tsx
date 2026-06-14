import { type LucideIcon, MailIcon, UserIcon } from "lucide-react";

export interface AvatarIconProps {
  readonly icon: "user" | "mail";
}

export function AvatarIcon({ icon }: AvatarIconProps) {
  const Icon: LucideIcon = icon === "user" ? UserIcon : MailIcon;

  return (
    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
      <Icon className="size-4" />
    </div>
  );
}
