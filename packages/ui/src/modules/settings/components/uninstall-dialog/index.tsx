"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface UninstallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (deleteAllData: boolean) => void;
}

export function UninstallDialog({
  open,
  onOpenChange,
  onConfirm,
}: UninstallDialogProps) {
  const [deleteData, setDeleteData] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Uninstall Lumo</AlertDialogTitle>
          <AlertDialogDescription>
            This will stop the daemon, remove the service configuration, and
            delete the daemon binary. The app will close after uninstalling.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex items-center gap-2 py-2">
          <Checkbox
            id="delete-data"
            checked={deleteData}
            onCheckedChange={(checked) => setDeleteData(checked === true)}
          />
          <Label htmlFor="delete-data" className="text-sm">
            Also delete all data (database, logs, daemon)
          </Label>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setDeleteData(false)}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => onConfirm(deleteData)}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Uninstall
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
