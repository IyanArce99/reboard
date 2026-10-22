import type { Metadata } from "next";
import { noindexRobots } from "@/lib/seo";

/** Pantallas personales (guardado, alertas, comparador): siempre noindex (docs/SEO.md). Con datos DEMO, también nofollow. */
export const privateMetadata = (title: string, description: string): Metadata => ({
  title,
  description,
  robots: noindexRobots(),
});
