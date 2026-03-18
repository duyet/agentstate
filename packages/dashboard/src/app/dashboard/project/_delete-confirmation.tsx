import { TrashIcon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
    <div className="border border-red-200 dark:border-red-900/50 rounded-lg p-5">
      <h3 className="font-medium text-red-600 dark:text-red-400 mb-2">Danger zone</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Permanently delete this project and all its data including conversations, messages, and API
        keys.
      </p>
      <AlertDialog onOpenChange={(open) => !open && onConfirmChange("")}>
        <AlertDialogTrigger
          render={
            <Button variant="destructive" size="sm">
              <TrashIcon className="h-4 w-4 mr-1.5" />
              Delete project
            </Button>
          }
        />
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {projectName}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the project and all
              associated conversations, messages, and API keys.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <label htmlFor="delete-confirm" className="text-sm text-muted-foreground mb-2 block">
              Type <code className="font-mono font-semibold text-foreground">{projectSlug}</code> to
              confirm
            </label>
            <Input
              id="delete-confirm"
              placeholder={projectSlug}
              value={confirmSlug}
              onChange={(e) => onConfirmChange(e.target.value)}
              className="font-mono"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              disabled={confirmSlug !== projectSlug || deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? "Deleting..." : "Delete project"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
