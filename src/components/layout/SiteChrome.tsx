/**
 * Cabecera, pie y bandeja de comparar del marketplace. En /admin se ocultan con CSS
 * (clase `pf-admin` de PageFlag, en globals.css): el panel tiene su propia
 * navegación. Sin usePathname, para no sacar la cabecera del HTML estático de las páginas públicas.
 */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  return (
    <div data-site-chrome="" style={{ display: "contents" }}>
      {children}
    </div>
  );
}
