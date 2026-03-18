import { CheckIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface DomainVerifiedAlertProps {
  sslEnabled: boolean;
}

export function _DomainVerifiedAlert({ sslEnabled }: DomainVerifiedAlertProps) {
  return (
    <Alert>
      <CheckIcon className="h-4 w-4" />
      <AlertTitle>Domain verified</AlertTitle>
      <AlertDescription>
        Your domain is verified and ready to use. SSL is{" "}
        {sslEnabled ? "enabled" : "being provisioned"}.
      </AlertDescription>
    </Alert>
  );
}
