import { type LucideIcon, MailIcon, UserIcon } from "lucide-react";

export interface AvatarIconProps {
  readonly icon: "user" | "mail";
  readonly variant?: "default" | "muted";
}

export function AvatarIcon({ icon, variant = "default" }: AvatarIconProps) {
  const Icon: LucideIcon = icon === "user" ? UserIcon : MailIcon;
  const bgClass =
    variant === "muted" ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary";

  return (
    <div className={`flex size-8 shrink-0 items-center justify-center rounded-full ${bgClass}`}>
      <Icon className="size-4" />
    </div>
  );
}
