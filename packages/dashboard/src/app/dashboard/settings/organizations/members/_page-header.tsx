import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export interface _PageHeaderProps {
  readonly organizationName?: string;
  readonly isLoading?: boolean;
}

export function _PageHeader({ organizationName, isLoading }: _PageHeaderProps) {
  return (
    <div className="flex items-center gap-4">
      <Link href="/dashboard/settings/organizations">
        <Button variant="ghost" size="icon" disabled={isLoading}>
          <ArrowLeftIcon />
        </Button>
      </Link>
      <div className="flex-1">
        <h1 className="text-3xl font-bold tracking-tight">Members</h1>
        <p className="text-muted-foreground mt-2">
          {organizationName ? `${organizationName} · ` : ""}Manage organization members
        </p>
      </div>
    </div>
  );
}
