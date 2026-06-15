"use client";

import { Trash, X } from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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
          <Button variant="danger" className="w-fit" onClick={() => setOpen(true)}>
            <Trash size={16} aria-hidden />
            Delete project
          </Button>
        </div>
      </Card>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="delete-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <Card className="w-full max-w-md p-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-2">
                  <h2
                    id="delete-title"
                    className="text-[17px] font-semibold tracking-tight text-fg"
                  >
                    Delete {projectName}?
                  </h2>
                  <p className="text-[13px] leading-5 text-fg-3">
                    This action cannot be undone. This will permanently delete the project and all
                    associated conversations, messages, and API keys.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Close"
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-[var(--radius)] text-fg-4 transition-[background-color,color] hover:bg-panel2 hover:text-fg"
                >
                  <X size={16} aria-hidden />
                </button>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="delete-confirm" className="text-[13px] text-fg-2">
                  Type <code className="num font-mono font-semibold text-fg">{projectSlug}</code> to
                  confirm
                </label>
                <input
                  id="delete-confirm"
                  type="text"
                  placeholder={projectSlug}
                  value={confirmSlug}
                  onChange={(e) => onConfirmChange(e.target.value)}
                  className="num rounded-[var(--radius)] border border-edge bg-panel2 px-3 py-2 font-mono text-[13px] text-fg outline-none transition-[border-color] focus:border-accent"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={close}>
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={onDelete}
                  disabled={confirmSlug !== projectSlug || deleting}
                >
                  {deleting ? "Deleting..." : "Delete project"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
