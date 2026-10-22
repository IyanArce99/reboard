"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { moderateAction } from "@/app/moderacion/actions";
import { useUserState } from "@/components/user/UserStateProvider";
import ui from "@/styles/ui.module.css";
import styles from "./Moderation.module.css";

export interface ModerationRowData {
  publicId: string;
  href: string;
  title: string;
  moderation: string;
  status: string;
  reports: { reason: string; details: string | null; at: string }[];
}

export function ModerationRow({ row }: { row: ModerationRowData }) {
  const { toast } = useUserState();
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(action: "remove" | "restore" | "dismiss_reports") {
    if (action === "remove" && !window.confirm("¿Retirar el anuncio? Se ocultará y se borrarán sus fotos.")) return;
    setBusy(true);
    const r = await moderateAction({ publicId: row.publicId, action, reason });
    setBusy(false);
    toast(r.ok ? "Acción registrada" : r.message);
    if (r.ok) router.refresh();
  }

  return (
    <article className={styles.row} aria-busy={busy || undefined}>
      <div className={styles.rowHead}>
        <Link href={row.href} target="_blank" className={styles.rowTitle}>
          {row.title}
        </Link>
        <span className={styles.badge} data-tone={row.moderation}>
          {row.moderation === "flagged" ? "En revisión" : row.moderation === "removed" ? "Retirado" : "Visible"} · {row.status}
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
      <label className={styles.reasonLabel}>
        Nota interna (opcional)
        <input className={ui.input} maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} />
      </label>
      <div className={styles.actions}>
        <button type="button" className={ui.btnStrong} disabled={busy} onClick={() => void run("remove")}>
          Retirar
        </button>
        <button type="button" className={ui.btnNeutral} disabled={busy} onClick={() => void run("dismiss_reports")}>
          Descartar reportes
        </button>
        {row.moderation === "removed" && (
          <button type="button" className={ui.btnNeutral} disabled={busy} onClick={() => void run("restore")}>
            Restaurar
          </button>
        )}
      </div>
    </article>
  );
}
