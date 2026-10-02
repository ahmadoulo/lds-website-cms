import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { useShellT } from '../../lib/i18n/useT';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Destructive actions are never one click away. */
export const ConfirmDialog = ({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel,
  isLoading,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => {
  const t = useShellT();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            {cancelLabel ?? t.common.cancel}
          </Button>
          <Button variant="danger" onClick={onConfirm} isLoading={isLoading}>
            {confirmLabel ?? t.common.delete}
          </Button>
        </>
      }
    >
      <div className="flex gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-50">
          {/* Not directional: a warning triangle is never mirrored. */}
          <AlertTriangle className="h-5 w-5 text-red-600" />
        </div>
        <p className="text-sm leading-relaxed text-navy/75">{message}</p>
      </div>
    </Modal>
  );
};
