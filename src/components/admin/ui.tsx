// Piezas del panel de administración (Server Components, sin estado).
import Link from "next/link";
import styles from "./Admin.module.css";

export { styles as adminStyles };

export function PageHeader({
  title,
  subtitle,
  crumbs,
  actions,
}: {
  title: string;
  subtitle?: React.ReactNode;
  crumbs?: { href: string; label: string }[];
  actions?: React.ReactNode;
}) {
  return (
    <div className={styles.head}>
      <div>
        {crumbs?.length ? (
          <nav className={styles.crumbs} aria-label="Ruta">
            {crumbs.map((c, i) => (
              <span key={c.href}>
                {i > 0 && " / "}
                <Link href={c.href}>{c.label}</Link>
              </span>
            ))}
          </nav>
        ) : null}
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
      {actions && <div className={styles.headActions}>{actions}</div>}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  href,
  tone,
}: {
  label: string;
  value: number | string;
  hint?: string;
  href?: string;
  tone?: "warning";
}) {
  const body = (
    <>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue}>{typeof value === "number" ? value.toLocaleString("es-ES") : value}</span>
      {hint && <span className={styles.statHint}>{hint}</span>}
    </>
  );
  return href ? (
    <Link href={href} className={styles.stat} data-tone={tone}>
      {body}
    </Link>
  ) : (
    <div className={styles.stat} data-tone={tone}>
      {body}
    </div>
  );
}

export type Tone = "success" | "warning" | "error" | "info" | "neutral";

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span className={styles.badge} data-tone={tone === "neutral" ? undefined : tone}>
      {children}
    </span>
  );
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className={styles.empty} role="status">
      <strong>{title}</strong>
      {children}
    </div>
  );
}

export function Notice({ tone, children }: { tone?: "warning" | "error"; children: React.ReactNode }) {
  return (
    <p className={styles.notice} data-tone={tone} role={tone === "error" ? "alert" : "note"}>
      {children}
    </p>
  );
}

/** Paginación por enlaces (GET): conserva los filtros de la URL. */
export function Pager({
  page,
  pageSize,
  total,
  basePath,
  params,
}: {
  page: number;
  pageSize: number;
  total: number;
  basePath: string;
  params: Record<string, string | undefined>;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const href = (p: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
    if (p > 1) q.set("pagina", String(p));
    const s = q.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <nav className={styles.pager} aria-label="Paginación">
      <span>
        {total === 0 ? "Sin resultados" : `${from.toLocaleString("es-ES")}–${to.toLocaleString("es-ES")} de ${total.toLocaleString("es-ES")}`}
      </span>
      <div className={styles.pagerLinks}>
        {page > 1 ? <Link href={href(page - 1)}>← Anterior</Link> : <span aria-hidden="true">← Anterior</span>}
        {page < pages ? <Link href={href(page + 1)}>Siguiente →</Link> : <span aria-hidden="true">Siguiente →</span>}
      </div>
    </nav>
  );
}

/** Página actual desde ?pagina= (1 por defecto, con límites). */
export const pageParam = (v: string | string[] | undefined) => {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return Number.isInteger(n) && n >= 1 && n <= 10_000 ? n : 1;
};

export const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;

export const fmtDate = (iso: string | null | undefined, withTime = false) =>
  iso
    ? new Date(iso).toLocaleString("es-ES", withTime ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" })
    : "—";

/**
 * Barras simples por día (SVG accesible). Solo con datos: si no hay ninguno, no se dibuja nada.
 */
export function BarChart({ data, label }: { data: { day: string; n: number }[]; label: string }) {
  if (!data.length || data.every((d) => d.n === 0)) return null;
  const max = Math.max(...data.map((d) => d.n));
  const w = 600;
  const h = 160;
  const pad = 22;
  const bw = (w - pad * 2) / data.length;
  return (
    <figure>
      <svg viewBox={`0 0 ${w} ${h}`} className={styles.chart} role="img" aria-label={label}>
        <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} className={styles.chartAxis} />
        {data.map((d, i) => {
          const bh = ((h - pad * 2) * d.n) / max;
          return (
            <g key={d.day}>
              <rect
                x={pad + i * bw + bw * 0.15}
                y={h - pad - bh}
                width={Math.max(2, bw * 0.7)}
                height={bh}
                rx={2}
                className={styles.chartBar}
              >
                <title>{`${new Date(d.day).toLocaleDateString("es-ES")}: ${d.n}`}</title>
              </rect>
            </g>
          );
        })}
        <text x={pad} y={h - 6} className={styles.chartLabel}>
          {new Date(data[0].day).toLocaleDateString("es-ES")}
        </text>
        <text x={w - pad} y={h - 6} textAnchor="end" className={styles.chartLabel}>
          {new Date(data[data.length - 1].day).toLocaleDateString("es-ES")}
        </text>
        <text x={pad} y={12} className={styles.chartLabel}>
          máx. {max}
        </text>
      </svg>
      <figcaption className={styles.small}>{label}</figcaption>
    </figure>
  );
}
