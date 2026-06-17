"use client";

import { Trash } from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogTrigger } from "@/components/ui/dialog";

interface DeleteConfirmationProps {
  projectName: string;
  projectSlug: string;
  confirmSlug: string;
  deleting: boolean;
  onConfirmChange: (slug: string) => void;
  onDelete: () => void;
}

export function DeleteConfirmation({
  projectName,
  projectSlug,
  confirmSlug,
  deleting,
  onConfirmChange,
  onDelete,
}: DeleteConfirmationProps) {
  const [open, setOpen] = useState(false);

  const close = () => {
    setOpen(false);
    onConfirmChange("");
  };

  return (
    <>
      <Card className="border-neg/30 p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h3 className="text-[15px] font-semibold tracking-tight text-fg">Danger zone</h3>
            <p className="text-[13px] leading-5 text-fg-3">
              Permanently delete this project and all its data including conversations, messages,
              and API keys.
            </p>
          </div>
          <DialogTrigger asChild>
            <Button variant="danger" className="w-fit" onClick={() => setOpen(true)}>
              <Trash size={16} aria-hidden />
              Delete project
            </Button>
          </DialogTrigger>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          title={`Delete ${projectName}?`}
          description="This action cannot be undone. This will permanently delete the project and all associated conversations, messages, and API keys."
          className="max-w-md"
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="delete-confirm" className="text-[13px] text-fg-2">
                Type <code className="as-mono font-semibold text-fg">{projectSlug}</code> to confirm
              </label>
              <input
                id="delete-confirm"
                type="text"
                placeholder={projectSlug}
                value={confirmSlug}
                onChange={(e) => onConfirmChange(e.target.value)}
                className="as-mono rounded-[var(--radius)] border border-edge bg-panel2 px-3 py-2 font-mono text-[13px] text-fg outline-none transition-[border-color] focus:border-accent"
              />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={close}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={onDelete}
                disabled={confirmSlug !== projectSlug || deleting}
                loading={deleting}
              >
                {deleting ? "Deleting..." : "Delete project"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
