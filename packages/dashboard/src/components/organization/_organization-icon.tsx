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
  primary: "text-foreground",
};

// md/lg render as a hairline icon tile to match the dashboard's folder/key
// tiles; sm stays bare for inline use inside dropdown menu items.
const tiledSizes = new Set(["md", "lg"]);

export function OrganizationIcon({
  icon: Icon = Building2Icon,
  size = "md",
  variant = "primary",
  className,
}: OrganizationIconProps) {
  const tiled = tiledSizes.has(size);
  return (
    <div
      className={cn(
        "flex aspect-square shrink-0 items-center justify-center",
        sizeClasses[size],
        variantClasses[variant],
        tiled && "rounded-lg border border-border bg-bg-deep",
        className,
      )}
      aria-hidden="true"
    >
      <Icon className={cn(size === "lg" ? "size-5" : "size-4")} />
    </div>
  );
}
