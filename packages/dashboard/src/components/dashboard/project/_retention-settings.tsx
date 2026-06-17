"use client";

import type { ProjectDetailResponse } from "@agentstate/shared";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

interface RetentionSettingsProps {
  project: ProjectDetailResponse;
  onUpdated: (updated: ProjectDetailResponse) => void;
}

export function RetentionSettings({ project, onUpdated }: RetentionSettingsProps) {
  const [retentionDays, setRetentionDays] = useState<string>(
    project.retention_days != null ? String(project.retention_days) : "",
  );
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  const currentDisplay =
    project.retention_days != null ? `${project.retention_days} days` : "Forever (no retention)";

  async function handleSave() {
    const trimmed = retentionDays.trim();
    const value = trimmed === "" ? null : Number(trimmed);

    if (
      value !== null &&
      (Number.isNaN(value) || !Number.isInteger(value) || value < 1 || value > 3650)
    ) {
      toast.error("Retention must be between 1 and 3650 days, or empty for infinite.");
      return;
    }

    setSaving(true);
    try {
      const updated = await api<ProjectDetailResponse>(`/v2/projects/${project.id}`, {
        method: "PATCH",
        body: JSON.stringify({ retention_days: value }),
      });
      onUpdated(updated);
      setOpen(false);
      toast.success("Retention setting saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save retention setting");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="flex flex-col gap-4 p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-[15px] font-semibold tracking-tight text-fg">Data retention</h2>
        <p className="text-[13px] leading-5 text-fg-3">
          Automatically delete conversations older than a specified number of days. Leave empty for
          infinite retention.
        </p>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="secondary" onClick={() => setOpen(true)}>
            Change
          </Button>
        </DialogTrigger>
        <DialogContent
          title="Change retention period"
          description="Conversations older than this will be permanently deleted daily at 3 AM UTC."
          className="max-w-md"
        >
          <Input
            label="Retention period"
            type="number"
            min={1}
            max={3650}
            placeholder="Leave empty for infinite"
            value={retentionDays}
            onChange={(e) => setRetentionDays(e.target.value)}
            mono
            error={
              retentionDays &&
              (Number.isNaN(Number(retentionDays)) ||
                Number(retentionDays) < 1 ||
                Number(retentionDays) > 3650)
                ? "Must be between 1 and 3650 days"
                : undefined
            }
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={saving} loading={saving}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="flex items-center gap-3 text-[13px] text-fg-3">
        <span>Current: {currentDisplay}</span>
      </div>
    </Card>
  );
}
