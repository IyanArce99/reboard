"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { updateListingTextsAction } from "@/app/admin/anuncios/actions";
import { useUserState } from "@/components/user/UserStateProvider";
import styles from "@/components/admin/Admin.module.css";
import ls from "./Listings.module.css";
import { EDITABLE_FIELDS, EDITABLE_LABEL, EDITABLE_MAX, changedFields, type EditableField } from "./model";

const LONG: EditableField[] = ["repairs", "description"];

/**
 * Corrección de textos de un anuncio con motivo (queda en la auditoría). Solo envía los campos que
 * cambian. Las medidas no aparecen: son responsabilidad del vendedor y la base de datos las rechaza.
 */
export function EditTextsForm({ publicId, initial }: { publicId: string; initial: Record<EditableField, string | null> }) {
  const router = useRouter();
  const { toast } = useUserState();
  const id = useId();
  const blank = () => Object.fromEntries(EDITABLE_FIELDS.map((k) => [k, initial[k] ?? ""])) as Record<EditableField, string>;
  const [values, setValues] = useState(blank);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const patch = changedFields(initial, values);
  const dirty = Object.keys(patch).length > 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dirty) {
      setError("No hay cambios que guardar.");
      return;
    }
    if (reason.trim().length < 3) {
      setError("Indica el motivo (al menos 3 caracteres): queda en la auditoría.");
      return;
    }
    setBusy(true);
    setError("");
    const r = await updateListingTextsAction(publicId, patch, reason.trim());
    setBusy(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setReason("");
    toast(r.message);
    router.refresh();
  };

  return (
    <details className={styles.card}>
      <summary className={ls.summary}>
        Editar textos
      </summary>
      <form onSubmit={submit} className={ls.form} aria-describedby={`${id}-help`}>
        <p id={`${id}-help`} className={styles.muted}>
          Solo textos con causa administrativa (datos personales en la descripción, errores evidentes…). Las medidas, el precio y las
          fotos no se editan desde aquí: son del vendedor.
        </p>
        {EDITABLE_FIELDS.map((k) => (
          <label key={k} className={styles.field} htmlFor={`${id}-${k}`}>
            {EDITABLE_LABEL[k]}
            {LONG.includes(k) ? (
              <textarea
                id={`${id}-${k}`}
                maxLength={EDITABLE_MAX[k]}
                rows={k === "description" ? 6 : 3}
                value={values[k]}
                onChange={(e) => setValues((v) => ({ ...v, [k]: e.target.value }))}
              />
            ) : (
              <input
                id={`${id}-${k}`}
                maxLength={EDITABLE_MAX[k]}
                required={k === "town"}
                minLength={k === "town" ? 2 : undefined}
                value={values[k]}
                onChange={(e) => setValues((v) => ({ ...v, [k]: e.target.value }))}
              />
            )}
          </label>
        ))}
        <label className={styles.field} htmlFor={`${id}-reason`}>
          Motivo (obligatorio)
          <textarea id={`${id}-reason`} maxLength={1000} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>
        {error && (
          <p className={styles.dialogError} role="alert">
            {error}
          </p>
        )}
        <div className={styles.btnRow}>
          <button type="submit" className={styles.btnPrimary} disabled={busy || !dirty} aria-busy={busy || undefined}>
            {busy ? "Guardando…" : "Guardar cambios"}
          </button>
          <button
            type="button"
            className={styles.btn}
            disabled={busy || !dirty}
            onClick={() => {
              setValues(blank());
              setError("");
            }}
          >
            Deshacer cambios
          </button>
        </div>
      </form>
    </details>
  );
}
