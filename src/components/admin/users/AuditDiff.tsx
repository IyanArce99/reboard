import { adminStyles as s } from "@/components/admin/ui";
import { auditDiff } from "./format";

/** Cambios compactos de una fila de auditoría: «clave: antes → después». Nada si no hay datos. */
export function AuditDiff({ before, after }: { before: unknown; after: unknown }) {
  const { rows, more } = auditDiff(before, after);
  if (!rows.length) return <span className={s.small}>—</span>;
  return (
    <ul className={s.small} style={{ listStyle: "none", margin: 0, padding: 0 }}>
      {rows.map((r) => (
        <li key={r.key} className={s.mono} style={{ wordBreak: "break-word" }}>
          <strong>{r.key}</strong>: {r.before} → {r.after}
        </li>
      ))}
      {more > 0 && <li>y {more} cambio{more === 1 ? "" : "s"} más</li>}
    </ul>
  );
}
