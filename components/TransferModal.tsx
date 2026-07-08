'use client';

import { useEffect, useRef } from 'react';

export function TransferModal({
  open,
  busy,
  onClose,
  onConfirm,
}: {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onConfirm: (to: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="transfer-title">
      <form
        className="terminal w-full max-w-md rounded-sm border border-[var(--phosphor-deep)] p-4"
        onSubmit={(e) => {
          e.preventDefault();
          const to = inputRef.current?.value.trim() ?? '';
          onConfirm(to);
        }}
      >
        <p id="transfer-title" className="glow text-sm">transfer Soul ◈</p>
        <p className="mt-1 text-xs text-[var(--phosphor-dim)]">
          hand over the character on-chain. your private memory stays encrypted to you.
        </p>
        <label className="mt-4 block text-xs text-[var(--phosphor-dim)]">
          recipient address
          <input
            ref={inputRef}
            className="term-input mt-1 w-full"
            placeholder="0x…"
            spellCheck={false}
            autoComplete="off"
            disabled={busy}
          />
        </label>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="term-btn rounded-sm px-3 py-1.5 text-xs">
            cancel
          </button>
          <button type="submit" disabled={busy} className="term-btn glow rounded-sm px-3 py-1.5 text-xs">
            {busy ? 'transferring…' : 'confirm transfer'}
          </button>
        </div>
      </form>
    </div>
  );
}
