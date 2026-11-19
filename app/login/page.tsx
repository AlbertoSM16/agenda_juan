"use client";

import { useActionState } from "react";
import { Wallet } from "lucide-react";
import { login } from "@/app/actions";
import { submitWithoutReset } from "@/components/form-dialog";
import { btn, cx, Field, inputCls } from "@/components/ui";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, { ok: false });
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <form onSubmit={(e) => submitWithoutReset(e, action)} className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent-soft text-accent">
            <Wallet size={18} />
          </span>
          <div>
            <h1 className="text-lg font-semibold leading-tight">Personal Hub</h1>
            <p className="text-xs text-muted">Inicia sesión para continuar</p>
          </div>
        </div>
        <div className="space-y-3">
          <Field label="Email">
            <input name="email" type="email" autoComplete="email" required className={inputCls} />
          </Field>
          <Field label="Contraseña">
            <input name="password" type="password" autoComplete="current-password" required className={inputCls} />
          </Field>
        </div>
        {state.error && <p className="mt-3 rounded-lg bg-neg-soft px-3 py-2 text-sm text-neg">{state.error}</p>}
        <button disabled={pending} className={cx(btn.base, btn.primary, "mt-5 w-full py-2.5")}>
          {pending ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
