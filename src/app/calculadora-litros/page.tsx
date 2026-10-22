import type { Metadata } from "next";
import { FinderSeo } from "@/components/finder/FinderSeo";
import { FinderWizard } from "@/components/finder/FinderWizard";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import styles from "@/components/finder/Finder.module.css";

const PATH = "/calculadora-litros";
const TITLE = "¿Qué tabla de surf necesito? Calculadora de litros";
const DESCRIPTION =
  "Calcula cuántos litros y qué tipo de tabla de surf te encajan en 7 preguntas cortas, y mira las tablas de segunda mano compatibles. Sin registro.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PATH, languages: { "es-ES": PATH } },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH },
};

export default function Page() {
  return (
    <main className={styles.page}>
      <FinderWizard
        intro={
          <>
            <Breadcrumbs items={[{ label: "Inicio", href: "/" }]} current={{ label: "¿Qué tabla necesito?", href: PATH }} />
            <h1 className={styles.h1}>¿Qué tabla necesito?</h1>
            <p className={styles.lead}>
              Calculadora de litros y tipo de tabla en 7 preguntas cortas, y las tablas de segunda mano que encajan contigo. Sin
              registro.
            </p>
          </>
        }
      />
      <FinderSeo />
    </main>
  );
}
