"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" for destructive actions (default); "primary" for neutral confirmations. */
  variant?: "danger" | "primary";
  loading?: boolean;
  onConfirm: () => void;
}

/**
 * Shared Cancel/Confirm dialog for destructive actions that need a single
 * explicit confirmation step (revoke key, remove member, delete domain).
 * Reserves the heavier typed-slug confirmation (see _delete-confirmation.tsx)
 * for the highest-blast-radius action, project deletion.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={title} description={description} className="max-w-md">
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={variant} onClick={onConfirm} loading={loading} disabled={loading}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
