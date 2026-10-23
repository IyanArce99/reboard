import type { Metadata } from "next";
import { FinderSeo } from "@/components/finder/FinderSeo";
import { FinderWizard } from "@/components/finder/FinderWizard";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import styles from "@/components/finder/Finder.module.css";

const PATH = "/calculadora-litros";
const TITLE = "¿Qué tabla de surf necesito? Calculadora de litros";
const DESCRIPTION =
  "Responde 7 preguntas y obtén un rango orientativo de litros y el tipo de tabla de surf que suele irte bien. Después, mira las tablas de segunda mano que encajan. Sin registro.";

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
            <Breadcrumbs items={[{ label: "Inicio", href: "/" }]} current={{ label: "TablaFinder", href: PATH }} />
            {/* «TablaFinder» es el nombre de la herramienta en la navegación; el H1 usa la pregunta tal como se busca. */}
            <p className={styles.kicker}>TablaFinder · Calculadora de litros</p>
            <h1 className={styles.h1}>¿Qué tabla de surf necesito?</h1>
            <p className={styles.lead}>
              Siete preguntas sobre tu peso, tu nivel y tus olas. Te damos un rango orientativo de litros, el tipo de tabla que
              suele irte bien y las tablas de segunda mano que hay publicadas en ese rango. Sin registro.
            </p>
          </>
        }
      />
      <FinderSeo />
    </main>
  );
}
