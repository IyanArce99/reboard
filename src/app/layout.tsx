import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed, IBM_Plex_Mono } from "next/font/google";
import { Suspense } from "react";
import { CompareTray } from "@/components/layout/CompareTray";
import { DemoBanner } from "@/components/layout/DemoBanner";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { UserStateProvider } from "@/components/user/UserStateProvider";
import { getRepository } from "@/lib/data";
import { getCatalogNames } from "@/lib/data/names";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";

const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const isDemo = getRepository().isDemo;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Tablas de surf de segunda mano en España · Reboard",
    template: "%s · Reboard",
  },
  description: "Compra y vende tablas de surf usadas. Busca por litros, medidas, tipo y ubicación. Sin comisiones.",
  applicationName: SITE_NAME,
  icons: { icon: "/favicon.svg" },
  openGraph: { siteName: SITE_NAME, locale: "es_ES", type: "website" },
  // Con datos DEMO no se indexa nada: los anuncios simulados no deben aparecer en buscadores.
  robots: isDemo ? { index: false, follow: false } : undefined,
};

export const viewport: Viewport = {
  themeColor: "#102D3B",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const repo = getRepository();
  const names = await getCatalogNames(repo);
  return (
    <html lang="es" className={`${barlow.variable} ${barlowCondensed.variable} ${plexMono.variable}`}>
      <body>
        <UserStateProvider>
          {repo.isDemo && <DemoBanner />}
          <Header names={names} />
          {children}
          <Footer />
          <Suspense fallback={null}>
            <CompareTray />
          </Suspense>
        </UserStateProvider>
      </body>
    </html>
  );
}
