import { BoardShape } from "./BoardShape";
import styles from "./EmptyState.module.css";

/** Tres siluetas apoyadas: ilustración ligera para estados vacíos (sin fotos en pantallas funcionales). */
export function BoardsIllustration({ size = 72 }: { size?: number }) {
  return (
    <span className={styles.boards} aria-hidden="true">
      <BoardShape shape="fish" size={size} tone="soft" />
      <BoardShape shape="longboard" size={size} />
      <BoardShape shape="evolutiva" size={size} tone="soft" />
    </span>
  );
}

interface Props {
  title: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  /** h2 por defecto; h3 dentro de secciones con su propio h2. */
  as?: "h2" | "h3";
}

/** Estado vacío común: ilustración, título, explicación y acciones. */
export function EmptyState({ title, children, actions, as: H = "h2" }: Props) {
  return (
    <div className={styles.empty}>
      <BoardsIllustration />
      <H className={styles.title}>{title}</H>
      {children && <div className={styles.text}>{children}</div>}
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  );
}
