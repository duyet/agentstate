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
      <AvatarIcon icon={iconType} />
      <div className="min-w-0">
        <p className="truncate text-[13.5px] font-medium text-fg">{name}</p>
        <p className="as-mono-sm truncate text-fg-3">{subtitle ?? email}</p>
      </div>
    </div>
  );
}
