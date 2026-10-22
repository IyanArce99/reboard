"use client";

// Error en el propio layout raíz: sustituye al documento entero, sin estilos globales ni fuentes
// (docs de Next: global-error). Por eso los estilos van en línea y con fuentes del sistema.

export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, background: "#102D3B", color: "#F4F1EA", fontFamily: "system-ui, sans-serif" }}>
        <title>Algo ha fallado · Reboard</title>
        <main style={{ maxWidth: 560, margin: "0 auto", padding: "96px 24px" }}>
          <p style={{ color: "#7AD1CE", letterSpacing: ".08em", textTransform: "uppercase", fontSize: 12 }}>Reboard</p>
          <h1 style={{ fontSize: 36, lineHeight: 1.05, margin: "12px 0" }}>Algo ha fallado</h1>
          <p style={{ fontSize: 17, lineHeight: 1.5, color: "#B4C8CC" }}>
            No hemos podido cargar la página. Vuelve a intentarlo dentro de un momento.
          </p>
          <div style={{ display: "flex", gap: 10, marginTop: 24, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => retry()}
              style={{ height: 48, padding: "0 20px", border: 0, borderRadius: 12, background: "#F4C15A", color: "#102D3B", fontWeight: 800, fontSize: 16 }}
            >
              Reintentar
            </button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- sin router: recarga completa a propósito */}
            <a href="/" style={{ height: 48, padding: "0 20px", display: "inline-flex", alignItems: "center", borderRadius: 12, border: "1.5px solid #F4F1EA", color: "#F4F1EA", fontWeight: 800, textDecoration: "none" }}>
              Volver al inicio
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
