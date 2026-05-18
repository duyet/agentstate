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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle className="text-destructive">Danger zone</CardTitle>
        <CardDescription>
          Permanently delete this project and all its data including conversations, messages, and
          API keys.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AlertDialog onOpenChange={(open) => !open && onConfirmChange("")}>
          <AlertDialogTrigger
            render={
              <Button variant="destructive" size="sm">
                <TrashIcon data-icon="inline-start" />
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
            <div className="flex flex-col gap-2 py-2">
              <Label htmlFor="delete-confirm" className="text-muted-foreground">
                Type <code className="font-mono font-semibold text-foreground">{projectSlug}</code>{" "}
                to confirm
              </Label>
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
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                {deleting ? "Deleting..." : "Delete project"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
