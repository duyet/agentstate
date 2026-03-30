"use client";

import type { ProjectDetailResponse } from "@agentstate/shared";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface RetentionSettingsProps {
  project: ProjectDetailResponse;
  onUpdated: (updated: ProjectDetailResponse) => void;
}

export function _RetentionSettings({ project, onUpdated }: RetentionSettingsProps) {
  const [retentionDays, setRetentionDays] = useState<string>(
    project.retention_days != null ? String(project.retention_days) : "",
  );
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const currentDisplay =
    project.retention_days != null ? `${project.retention_days} days` : "Forever (no retention)";

  async function handleSave() {
    const trimmed = retentionDays.trim();
    const value = trimmed === "" ? null : Number(trimmed);

    if (value !== null && (Number.isNaN(value) || !Number.isInteger(value) || value < 1 || value > 3650)) {
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
      setShowConfirm(false);
      toast.success("Retention setting saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save retention setting");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h3 className="font-medium mb-2">Data retention</h3>
      <p className="text-sm text-muted-foreground mb-3">
        Automatically delete conversations older than a specified number of days. Leave empty for
        infinite retention.
      </p>

      {showConfirm ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Input
              type="number"
              min={1}
              max={3650}
              placeholder="Leave empty for infinite"
              value={retentionDays}
              onChange={(e) => setRetentionDays(e.target.value)}
              className="max-w-[200px]"
            />
            <span className="text-sm text-muted-foreground">days</span>
          </div>
          <p className="text-sm text-amber-600 dark:text-amber-400">
            Conversations older than this will be permanently deleted daily at 3 AM UTC.
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Confirm"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowConfirm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Current: {currentDisplay}</span>
          <Button size="sm" variant="outline" onClick={() => setShowConfirm(true)}>
            Change
          </Button>
        </div>
      )}
    </div>
  );
}
