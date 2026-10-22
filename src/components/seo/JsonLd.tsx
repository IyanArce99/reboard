/** Datos estructurados JSON-LD (docs/SEO.md). Nunca AggregateRating ni reseñas inventadas. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // Se escapa «<» para que el contenido no pueda cerrar la etiqueta script.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
