import { Building2Icon, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface OrganizationIconProps {
  icon?: LucideIcon;
  size?: "sm" | "md" | "lg";
  className?: string;
  variant?: "muted" | "primary";
}

const sizeClasses = {
  sm: "size-4",
  md: "size-8",
  lg: "size-10",
};

const variantClasses = {
  muted: "text-muted-foreground",
  primary: "text-primary",
};

export function OrganizationIcon({
  icon: Icon = Building2Icon,
  size = "md",
  variant = "primary",
  className,
}: OrganizationIconProps) {
  return (
    <div
      className={cn(
        "flex aspect-square shrink-0 items-center justify-center",
        sizeClasses[size],
        variantClasses[variant],
        className,
      )}
      aria-hidden="true"
    >
      <Icon />
    </div>
  );
}
