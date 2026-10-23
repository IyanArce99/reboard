"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import { adminStyles as s } from "@/components/admin/ui";
import { useUserState } from "@/components/user/UserStateProvider";
import type { AdminActionResult } from "@/lib/admin/auth";

/** Resultado de un formulario del panel: además del mensaje, adónde ir si se ha creado algo. */
export type FormResult = AdminActionResult & { href?: string };

/**
 * Formulario de una Server Action del panel. La acción vuelve a comprobar el permiso y valida todo
 * en el servidor; aquí solo se envía, se muestra el error junto al botón (role=alert) y se refresca.
 */
export function ActionForm({
  action,
  submitLabel,
  children,
  reset = false,
  className,
  tone = "primary",
  ariaLabel,
}: {
  action: (fd: FormData) => Promise<FormResult>;
  submitLabel: string;
  children: React.ReactNode;
  /** Vaciar el formulario al guardar (altas). */
  reset?: boolean;
  className?: string;
  tone?: "primary" | "danger" | "default";
  ariaLabel?: string;
}) {
  const router = useRouter();
  const { toast } = useUserState();
  const ref = useRef<HTMLFormElement>(null);
  const errId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    let r: FormResult;
    try {
      r = await action(new FormData(e.currentTarget));
    } catch {
      r = { ok: false, message: "No se ha podido guardar. Vuelve a intentarlo." };
    }
    setBusy(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    toast(r.message);
    if (reset) ref.current?.reset();
    if (r.href) router.push(r.href);
    else router.refresh();
  };

  const btn = tone === "danger" ? s.btnDanger : tone === "default" ? s.btn : s.btnPrimary;
  return (
    <form ref={ref} className={className} onSubmit={submit} aria-label={ariaLabel} aria-describedby={error ? errId : undefined}>
      {children}
      {error && (
        <p id={errId} className={s.dialogError} role="alert">
          {error}
        </p>
      )}
      <div className={s.btnRow}>
        <button type="submit" className={btn} disabled={busy} aria-busy={busy || undefined}>
          {busy ? "Guardando…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

/** Botón sin diálogo para acciones reversibles y sin motivo (p. ej., subir o bajar una marca destacada). */
export function ActionButton({
  action,
  label,
  ariaLabel,
  disabled,
  tone = "default",
}: {
  action: () => Promise<AdminActionResult>;
  label: string;
  ariaLabel?: string;
  disabled?: boolean;
  tone?: "default" | "ghost";
}) {
  const router = useRouter();
  const { toast } = useUserState();
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    let r: AdminActionResult;
    try {
      r = await action();
    } catch {
      r = { ok: false, message: "No se ha podido guardar. Vuelve a intentarlo." };
    }
    setBusy(false);
    toast(r.message);
    if (r.ok) router.refresh();
  };
  return (
    <button
      type="button"
      className={tone === "ghost" ? s.btnGhost : s.btn}
      onClick={() => void run()}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      aria-label={ariaLabel}
    >
      {label}
    </button>
  );
}

/** Campo de slug que se rellena desde el nombre mientras no se edite a mano. */
export function NameSlugFields({
  nameLabel = "Nombre",
  defaultName = "",
  defaultSlug = "",
  maxName = 60,
  slugHint,
}: {
  nameLabel?: string;
  defaultName?: string;
  defaultSlug?: string;
  maxName?: number;
  slugHint?: string;
}) {
  const id = useId();
  const [name, setName] = useState(defaultName);
  const [slug, setSlug] = useState(defaultSlug);
  const [touched, setTouched] = useState(Boolean(defaultSlug));
  const auto = (v: string) =>
    v
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60)
      .replace(/-+$/, "");
  return (
    <>
      <label className={`${s.field} ${s.fieldGrow}`} htmlFor={`${id}-n`}>
        {nameLabel}
        <input
          id={`${id}-n`}
          name="name"
          required
          maxLength={maxName}
          autoComplete="off"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!touched) setSlug(auto(e.target.value));
          }}
        />
      </label>
      <label className={`${s.field} ${s.fieldGrow}`} htmlFor={`${id}-s`}>
        Slug (URL)
        <input
          id={`${id}-s`}
          name="slug"
          required
          pattern="[a-z0-9\-]{2,60}"
          maxLength={60}
          autoComplete="off"
          spellCheck={false}
          value={slug}
          aria-describedby={`${id}-sh`}
          onChange={(e) => {
            setTouched(true);
            setSlug(e.target.value);
          }}
        />
        <span id={`${id}-sh`} className={s.small} style={{ fontWeight: 400 }}>
          {slugHint ?? "Minúsculas, números y guiones. Cambiarlo cambia las URL públicas."}
        </span>
      </label>
    </>
  );
}
