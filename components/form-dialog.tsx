"use client";

import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { X } from "lucide-react";
import type { ActionState } from "@/app/actions";
import { btn, cx } from "@/components/ui";

type Props = {
  title: string;
  action: (s: ActionState, f: FormData) => Promise<ActionState>;
  trigger: (open: () => void) => ReactNode;
  children: ReactNode | ((close: () => void) => ReactNode);
  submitLabel?: string;
  onDone?: () => void;
};

/** Modal con un <form> conectado a una Server Action; se cierra al guardar bien. */
export function FormDialog({ title, action, trigger, children, submitLabel = "Guardar", onDone }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, formAction, pending] = useActionState(action, { ok: false });
  const [key, setKey] = useState(0);
  const open = () => {
    setKey((k) => k + 1); // remonta el formulario para limpiar estado
    ref.current?.showModal();
  };
  const close = () => ref.current?.close();

  useEffect(() => {
    if (state.ok && state.ts) {
      ref.current?.close();
      onDone?.();
    }
  }, [state, onDone]);

  return (
    <>
      {trigger(open)}
      <dialog
        ref={ref}
        className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-border bg-surface p-0 text-text shadow-2xl"
        onClick={(e) => e.target === ref.current && close()}
      >
        <form onSubmit={(e) => submitWithoutReset(e, formAction)} key={key} className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold">{title}</h3>
            <button type="button" onClick={close} className={cx(btn.base, btn.icon)} aria-label="Cerrar">
              <X size={16} />
            </button>
          </div>
          <div className="space-y-3">{typeof children === "function" ? children(close) : children}</div>
          {state.error && !pending && (
            <p className="mt-3 rounded-lg bg-neg-soft px-3 py-2 text-sm text-neg">{state.error}</p>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={close} className={cx(btn.base, btn.ghost)}>
              Cancelar
            </button>
            <button type="submit" disabled={pending} className={cx(btn.base, btn.primary)}>
              {pending ? "Guardando…" : submitLabel}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}

/** Botón de borrar con confirmación */
export function DeleteButton({ action, label = "este registro" }: { action: () => Promise<ActionState>; label?: string }) {
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      disabled={pending}
      className={cx(btn.base, btn.icon, "hover:text-neg")}
      aria-label="Borrar"
      title="Borrar"
      onClick={async () => {
        if (!confirm(`¿Borrar ${label}?`)) return;
        setPending(true);
        const r = await action();
        setPending(false);
        if (!r.ok) alert(r.error);
      }}
    >
      <TrashIcon />
    </button>
  );
}

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14" />
    </svg>
  );
}

/**
 * Envía el formulario a la acción sin el reseteo automático de React 19,
 * para no perder lo escrito cuando la acción devuelve un error.
 */
export function submitWithoutReset(e: FormEvent<HTMLFormElement>, action: (f: FormData) => void) {
  e.preventDefault();
  const fd = new FormData(e.currentTarget);
  startTransition(() => action(fd));
}
