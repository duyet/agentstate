"use client";

import type { ProjectDetailResponse } from "@agentstate/shared";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  const [showConfirm, setShowConfirm] = useState(false);

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
      setShowConfirm(false);
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
      {showConfirm ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1}
              max={3650}
              placeholder="Leave empty for infinite"
              value={retentionDays}
              onChange={(e) => setRetentionDays(e.target.value)}
              aria-label="Retention days"
              className="num w-[200px] rounded-[var(--radius)] border border-edge bg-panel2 px-3 py-2 font-mono text-[13px] text-fg outline-none transition-[border-color] focus:border-accent"
            />
            <span className="text-[13px] text-fg-3">days</span>
          </div>
          <p className="text-[13px] leading-5 text-fg-3">
            Conversations older than this will be permanently deleted daily at 3 AM UTC.
          </p>
          <div className="flex gap-2">
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Confirm"}
            </Button>
            <Button variant="secondary" onClick={() => setShowConfirm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <span className="text-[13px] text-fg-3">Current: {currentDisplay}</span>
          <Button variant="secondary" onClick={() => setShowConfirm(true)}>
            Change
          </Button>
        </div>
      )}
    </Card>
  );
}
