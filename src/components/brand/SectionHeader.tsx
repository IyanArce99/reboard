import Link from "next/link";
import styles from "./SectionHeader.module.css";

interface Props {
  /** Etiqueta superior (mono, turquesa). */
  eyebrow?: string;
  title: string;
  lead?: React.ReactNode;
  action?: { href: string; label: string };
  id?: string;
  /** Sobre fondo petróleo. */
  dark?: boolean;
  /** h2 por defecto; h1 en cabeceras de página. */
  as?: "h1" | "h2";
  align?: "start" | "center";
}

/** Cabecera de sección única en toda la web: etiqueta + título condensado + entradilla + enlace. */
export function SectionHeader({ eyebrow, title, lead, action, id, dark = false, as: H = "h2", align = "start" }: Props) {
  return (
    <div className={styles.head} data-dark={dark || undefined} data-align={align}>
      <div className={styles.text}>
        {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
        <H id={id} className={H === "h1" ? styles.h1 : styles.h2}>
          {title}
        </H>
        {lead && <p className={styles.lead}>{lead}</p>}
      </div>
      {action && (
        <Link href={action.href} className={styles.action}>
          {action.label} <span aria-hidden="true">→</span>
        </Link>
      )}
    </div>
  );
}
