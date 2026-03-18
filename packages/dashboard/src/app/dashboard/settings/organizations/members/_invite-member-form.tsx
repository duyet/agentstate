import { PlusIcon } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type Role = "org:member" | "org:admin";

export interface _InviteMemberFormProps {
  readonly isInviting: boolean;
  readonly onInvite: (email: string, role: Role) => Promise<void>;
}

export function _InviteMemberForm({ isInviting, onInvite }: _InviteMemberFormProps) {
  const [emailAddress, setEmailAddress] = React.useState("");
  const [selectedRole, setSelectedRole] = React.useState<Role>("org:member");

  const handleSubmit = React.useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!emailAddress.trim() || isInviting) return;

      await onInvite(emailAddress.trim(), selectedRole);
      setEmailAddress("");
      setSelectedRole("org:member");
    },
    [emailAddress, isInviting, selectedRole, onInvite],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite Member</CardTitle>
        <CardDescription>Send an invitation to join this organization</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex gap-2 items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="email">Email address</Label>
            <div className="flex gap-2">
              <Input
                id="email"
                type="email"
                placeholder="colleague@example.com"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.currentTarget.value)}
                disabled={isInviting}
                required
              />
              <Select
                value={selectedRole}
                onValueChange={(v) => setSelectedRole(v as Role)}
                disabled={isInviting}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="org:member">Member</SelectItem>
                  <SelectItem value="org:admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit" disabled={isInviting}>
                {isInviting ? (
                  "Sending..."
                ) : (
                  <>
                    <PlusIcon />
                    Invite
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
