"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { moderateAction } from "@/app/moderacion/actions";
import { MODERATION_VIEW, type ModerationView } from "@/components/admin/listings/model";
import { useUserState } from "@/components/user/UserStateProvider";
import ui from "@/styles/ui.module.css";
import { LISTING_STATUS_LABEL } from "./labels";
import styles from "./Moderation.module.css";

export interface ModerationRowData {
  publicId: string;
  href: string;
  title: string;
  view: ModerationView;
  status: string;
  reports: { reason: string; details: string | null; at: string }[];
}

type Action = "hide" | "remove" | "restore" | "dismiss_reports";

const CONFIRM: Partial<Record<Action, string>> = {
  hide: "¿Ocultar el anuncio temporalmente? Deja de verse en la web; fotos y datos se conservan y se puede restaurar.",
  remove: "¿Retirar el anuncio por incumplimiento? Deja de verse y el vendedor no podrá volver a publicarlo. Fotos y datos se conservan.",
};

export function ModerationRow({ row }: { row: ModerationRowData }) {
  const { toast } = useUserState();
  const router = useRouter();
  const reasonId = useId();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(action: Action) {
    if ((action === "hide" || action === "remove") && reason.trim().length < 3) {
      setError("Indica el motivo (al menos 3 caracteres): queda registrado.");
      return;
    }
    const ask = CONFIRM[action];
    if (ask && !window.confirm(ask)) return;
    setError("");
    setBusy(true);
    const r = await moderateAction({ publicId: row.publicId, action, reason });
    setBusy(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    toast(r.message);
    router.refresh();
  }

  const view = MODERATION_VIEW[row.view];
  const tone = row.view === "flagged" ? "flagged" : row.view === "visible" ? undefined : "removed";
  const canHide = row.view === "visible" || row.view === "flagged";

  return (
    <article className={styles.row} aria-busy={busy || undefined}>
      <div className={styles.rowHead}>
        <Link href={row.href} target="_blank" className={styles.rowTitle}>
          {row.title}
        </Link>
        <span className={styles.badge} data-tone={tone}>
          {view.label} · {LISTING_STATUS_LABEL[row.status] ?? row.status}
        </span>
      </div>
      <ul className={styles.reports}>
        {row.reports.map((r) => (
          <li key={r.at}>
            <strong>{r.reason}</strong>
            {r.details ? `: ${r.details}` : ""} <span>· {new Date(r.at).toLocaleDateString("es-ES")}</span>
          </li>
        ))}
      </ul>
      <label className={styles.reasonLabel} htmlFor={reasonId}>
        Motivo (obligatorio para ocultar o retirar; queda registrado)
        <input
          id={reasonId}
          className={ui.input}
          maxLength={1000}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          aria-describedby={error ? `${reasonId}-e` : undefined}
        />
      </label>
      {error && (
        <p id={`${reasonId}-e`} role="alert">
          {error}
        </p>
      )}
      <div className={styles.actions}>
        {canHide && (
          <button type="button" className={ui.btnNeutral} disabled={busy} onClick={() => void run("hide")}>
            Ocultar temporalmente
          </button>
        )}
        {row.view !== "removed" && (
          <button type="button" className={ui.btnStrong} disabled={busy} onClick={() => void run("remove")}>
            Retirar por incumplimiento
          </button>
        )}
        {(row.reports.length > 0 || row.view === "flagged") && (
          <button type="button" className={ui.btnNeutral} disabled={busy} onClick={() => void run("dismiss_reports")}>
            Descartar reportes
          </button>
        )}
        {(row.view === "hidden" || row.view === "removed") && (
          <button type="button" className={ui.btnNeutral} disabled={busy} onClick={() => void run("restore")}>
            Restaurar
          </button>
        )}
      </div>
    </article>
  );
}
