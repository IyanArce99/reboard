import Link from "next/link";
import ui from "@/styles/ui.module.css";

export default function NotFound() {
  return (
    <main className="container" style={{ paddingTop: 48, paddingBottom: 64 }}>
      <h1 className={ui.h1}>No encontramos esta página</h1>
      <p style={{ marginTop: 12, fontSize: 17, lineHeight: 1.5 }}>
        Puede que el anuncio se haya retirado o que el enlace no sea correcto. Tu próxima tabla ya existe: búscala por litros, tipo y zona.
      </p>
      <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
        <Link href="/buscar" className={ui.btnPrimary}>
          Buscar tablas
        </Link>
        <Link href="/" className={ui.btnNeutral}>
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
