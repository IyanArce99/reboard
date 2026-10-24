import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed, IBM_Plex_Mono } from "next/font/google";
import { Suspense } from "react";
import { AnalyticsInit } from "@/components/analytics/AnalyticsInit";
import { CompareTray } from "@/components/layout/CompareTray";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { SiteNotice } from "@/components/layout/SiteNotice";
import { UserStateProvider } from "@/components/user/UserStateProvider";
import { authEnabled } from "@/lib/auth/config";
import { siteIndexable } from "@/lib/data";
import { OG_BASE, SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";

const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// Títulos: solo se usa el 800 (H1, H2, logo). 600 y 700 se descargaban sin usarse (PERF-3).
const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["800"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  // Solo cifras y etiquetas pequeñas: no compite con el texto principal por la precarga.
  preload: false,
});


export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Tablas de surf de segunda mano en Canarias · Reboard",
    template: "%s · Reboard",
  },
  description: "Compra y vende tablas de surf de segunda mano en Canarias. Busca por litros, medidas, tipo e isla, sin comisiones.",
  applicationName: SITE_NAME,
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: OG_BASE,
  // Imagen grande al compartir (X/Twitter usa og:image si no hay una propia).
  twitter: { card: "summary_large_image" },
  // Sin base de datos la web está vacía: no se indexa hasta que haya anuncios reales.
  robots: siteIndexable() ? undefined : { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#102D3B",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${barlow.variable} ${barlowCondensed.variable} ${plexMono.variable}`}>
      <body>
        <UserStateProvider authEnabled={authEnabled()}>
          <a className="skip-link" href="#contenido">
            Saltar al contenido
          </a>
          <SiteChrome>
            <SiteNotice />
            <Header />
          </SiteChrome>
          <div id="contenido" className="skip-target" tabIndex={-1}>
            {children}
          </div>
          {/* Analítica de producto sin cookies (docs/ANALYTICS.md): no hace nada sin NEXT_PUBLIC_POSTHOG_KEY. */}
          <Suspense fallback={null}>
            <AnalyticsInit />
          </Suspense>
          <SiteChrome>
            <Footer />
            <Suspense fallback={null}>
              <CompareTray />
            </Suspense>
          </SiteChrome>
        </UserStateProvider>
      </body>
    </html>
  );
}
