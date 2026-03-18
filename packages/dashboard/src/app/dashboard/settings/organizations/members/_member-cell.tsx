import { AvatarIcon } from "./_avatar-icon";

export interface MemberCellProps {
  readonly name: string;
  readonly email: string;
  readonly iconType: "user" | "mail";
  readonly subtitle?: string;
}

export function MemberCell({ name, email, iconType, subtitle }: MemberCellProps) {
  return (
    <div className="flex items-center gap-3">
      <AvatarIcon icon={iconType} variant={iconType === "mail" ? "muted" : "default"} />
      <div className="min-w-0">
        <p className="font-medium truncate">{name}</p>
        <p className="text-sm text-muted-foreground truncate">{subtitle ?? email}</p>
      </div>
    </div>
  );
}
