import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SectionHeader } from "@/components/brand/SectionHeader";
import { ContactForm } from "@/components/contact/ContactForm";
import styles from "@/components/contact/Contact.module.css";
import { PageFlag } from "@/components/layout/PageFlag";

export const metadata: Metadata = {
  title: "Contacto",
  description: "Escribe a Reboard: problemas con un anuncio, tiendas y escuelas, privacidad o cualquier otra consulta. Te responde una persona.",
  alternates: { canonical: "/contacto" },
};

const SHORTCUTS = [
  {
    title: "¿Problema con un anuncio?",
    text: "En el propio anuncio, «Reportar» nos llega con el enlace y lo revisamos antes.",
    link: { href: "/buscar", label: "Buscar el anuncio" },
  },
  {
    title: "¿Quieres borrar tu cuenta?",
    text: "Puedes hacerlo tú en «Mi cuenta», al momento. Se borran tus anuncios, fotos y guardados.",
    link: { href: "/cuenta", label: "Ir a Mi cuenta" },
  },
  {
    title: "¿Cómo vender tu tabla?",
    text: "Publicar es gratis y sin comisiones. Te contamos los pasos y qué fotos funcionan mejor.",
    link: { href: "/vender", label: "Ver cómo se vende" },
  },
] as const;

export default function ContactPage() {
  return (
    <main className="container">
      {/* La página tiene su propia acción principal (enviar): «Vender» de la cabecera en contorno. */}
      <PageFlag flag="cta-other" />
      <div style={{ paddingTop: 28 }}>
        <SectionHeader
          as="h1"
          eyebrow="Contacto"
          title="¿Hablamos?"
          lead="Te responde una persona de Reboard, por email. Elige el motivo y cuéntanos."
        />
      </div>
      <div className={styles.layout}>
        <Suspense fallback={<div className={styles.form} style={{ minHeight: 620 }} aria-hidden="true" />}>
          <ContactForm />
        </Suspense>
        <aside className={styles.aside} aria-labelledby="contact-aside-title">
          <h2 id="contact-aside-title" className={styles.asideTitle}>
            A lo mejor te sirve
          </h2>
          {SHORTCUTS.map((s) => (
            <div key={s.title} className={styles.card}>
              <h3 className={styles.cardTitle}>{s.title}</h3>
              <p className={styles.cardText}>{s.text}</p>
              <Link href={s.link.href} className={styles.cardLink}>
                {s.link.label} <span aria-hidden="true">&nbsp;→</span>
              </Link>
            </div>
          ))}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>¿Prefieres el email?</h3>
            <p className={styles.cardText}>Escríbenos directamente, también te leemos.</p>
            <a href="mailto:hola@reboard.es" className={`${styles.cardLink} ${styles.mail}`}>
              hola@reboard.es
            </a>
          </div>
        </aside>
      </div>
    </main>
  );
}
