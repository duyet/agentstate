"use client";

import { Button } from "@cloudflare/kumo/components/button";
import { Dialog } from "@cloudflare/kumo/components/dialog";
import { Input } from "@cloudflare/kumo/components/input";
import { LayerCard } from "@cloudflare/kumo/components/layer-card";
import { Text } from "@cloudflare/kumo/components/text";
import { Trash } from "@phosphor-icons/react";

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
  return (
    <LayerCard className="p-6 ring-kumo-danger/30">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <Text variant="heading3" as="h3">
            Danger zone
          </Text>
          <Text variant="secondary" size="sm" as="p">
            Permanently delete this project and all its data including conversations, messages, and
            API keys.
          </Text>
        </div>
        <Dialog.Root role="alertdialog" onOpenChange={(open) => !open && onConfirmChange("")}>
          <Dialog.Trigger
            render={(props) => (
              <Button variant="destructive" size="sm" {...props}>
                <Trash aria-hidden />
                Delete project
              </Button>
            )}
          />
          <Dialog className="p-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Dialog.Title className="text-lg font-semibold text-foreground">
                  Delete {projectName}?
                </Dialog.Title>
                <Dialog.Description className="text-sm text-muted-foreground">
                  This action cannot be undone. This will permanently delete the project and all
                  associated conversations, messages, and API keys.
                </Dialog.Description>
              </div>
              <Input
                label={
                  <>
                    Type{" "}
                    <code className="font-mono font-semibold text-foreground">{projectSlug}</code>{" "}
                    to confirm
                  </>
                }
                placeholder={projectSlug}
                value={confirmSlug}
                onChange={(e) => onConfirmChange(e.target.value)}
                className="font-mono"
              />
              <div className="flex justify-end gap-2">
                <Dialog.Close
                  render={(props) => (
                    <Button variant="ghost" size="sm" {...props}>
                      Cancel
                    </Button>
                  )}
                />
                <Dialog.Close
                  render={(props) => (
                    <Button
                      variant="destructive"
                      size="sm"
                      {...props}
                      onClick={onDelete}
                      disabled={confirmSlug !== projectSlug || deleting}
                    >
                      {deleting ? "Deleting..." : "Delete project"}
                    </Button>
                  )}
                />
              </div>
            </div>
          </Dialog>
        </Dialog.Root>
      </div>
    </LayerCard>
  );
}
