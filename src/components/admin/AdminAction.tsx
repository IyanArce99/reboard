"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import { useUserState } from "@/components/user/UserStateProvider";
import type { AdminActionResult } from "@/lib/admin/auth";
import styles from "./Admin.module.css";

/**
 * Botón de acción administrativa: abre un diálogo con el motivo (queda en la auditoría), una casilla
 * opcional y confirmación explícita para lo destructivo. Llama a una Server Action, que vuelve a
 * comprobar el permiso en el servidor, y refresca la página. El diálogo es <dialog> nativo (foco y Escape).
 */
export function AdminAction({
  label,
  title,
  description,
  action,
  reason = "required",
  tone = "default",
  confirmLabel,
  option,
}: {
  label: string;
  title: string;
  description?: string;
  /** Server Action ya enlazada a su entidad (`action.bind(null, id)`). */
  action: (reason: string, option: boolean) => Promise<AdminActionResult>;
  reason?: "required" | "optional" | "none";
  tone?: "default" | "primary" | "danger";
  confirmLabel?: string;
  option?: { label: string; defaultChecked?: boolean };
}) {
  const router = useRouter();
  const { toast } = useUserState();
  const ref = useRef<HTMLDialogElement>(null);
  const reasonId = useId();
  const [text, setText] = useState("");
  const [opt, setOpt] = useState(option?.defaultChecked ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const open = () => {
    setError("");
    setText("");
    setOpt(option?.defaultChecked ?? false);
    ref.current?.showModal();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reason === "required" && text.trim().length < 3) {
      setError("Indica el motivo (al menos 3 caracteres): queda en la auditoría.");
      return;
    }
    setBusy(true);
    setError("");
    const r = await action(text.trim(), opt);
    setBusy(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    ref.current?.close();
    toast(r.message);
    router.refresh();
  };

  const btnClass = tone === "danger" ? styles.btnDanger : tone === "primary" ? styles.btnPrimary : styles.btn;

  return (
    <>
      <button type="button" className={btnClass} onClick={open}>
        {label}
      </button>
      <dialog ref={ref} className={styles.dialog} aria-labelledby={`${reasonId}-t`}>
        <form className={styles.dialogBody} onSubmit={submit}>
          <h2 id={`${reasonId}-t`} className={styles.dialogTitle}>
            {title}
          </h2>
          {description && <p className={styles.muted}>{description}</p>}
          {reason !== "none" && (
            <label className={styles.field} htmlFor={reasonId}>
              Motivo{reason === "required" ? " (obligatorio)" : " (opcional)"}
              <textarea
                id={reasonId}
                maxLength={1000}
                value={text}
                onChange={(e) => setText(e.target.value)}
                aria-describedby={error ? `${reasonId}-e` : undefined}
              />
            </label>
          )}
          {option && (
            <label className={styles.check}>
              <input type="checkbox" checked={opt} onChange={(e) => setOpt(e.target.checked)} />
              {option.label}
            </label>
          )}
          {error && (
            <p id={`${reasonId}-e`} className={styles.dialogError} role="alert">
              {error}
            </p>
          )}
          <div className={styles.btnRow}>
            <button type="submit" className={tone === "danger" ? styles.btnDanger : styles.btnPrimary} disabled={busy} aria-busy={busy || undefined}>
              {busy ? "Guardando…" : (confirmLabel ?? label)}
            </button>
            <button type="button" className={styles.btn} onClick={() => ref.current?.close()} disabled={busy}>
              Cancelar
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
