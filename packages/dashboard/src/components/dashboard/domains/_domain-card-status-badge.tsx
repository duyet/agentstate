import type { CustomDomainResponse } from "@agentstate/shared";
import { Badge } from "@/components/ui/badge";

const STATUS_TONES = {
  verified: "live" as const,
  failed: "warn" as const,
  pending: "idle" as const,
} satisfies Record<CustomDomainResponse["verification_status"], "live" | "warn" | "idle">;

interface DomainStatusBadgeProps {
  status: CustomDomainResponse["verification_status"];
}

export function _DomainStatusBadge({ status }: DomainStatusBadgeProps) {
  return (
    <Badge tone={STATUS_TONES[status]} dot>
      {status}
    </Badge>
  );
}
