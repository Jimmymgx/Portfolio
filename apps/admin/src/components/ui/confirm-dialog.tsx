"use client";

import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { Button } from "./button";

interface Props {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Accessible confirmation for destructive or irreversible actions. Focus starts on Cancel. */
export function ConfirmDialog({ open, title, description, confirmLabel = "Confirm", cancelLabel = "Cancel", destructive, loading, onConfirm, onCancel }: Props) {
  return (
    <AlertDialog.Root open={open} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-[2px]" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-[61] w-[calc(100vw-24px)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-card p-6 shadow-2xl">
          <AlertDialog.Title className="text-lg font-semibold tracking-tight">{title}</AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm leading-relaxed text-mute">{description}</AlertDialog.Description>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialog.Cancel asChild>
              <Button variant="outline" onClick={onCancel}>
                {cancelLabel}
              </Button>
            </AlertDialog.Cancel>
            <Button variant={destructive ? "danger" : "default"} loading={loading} onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
