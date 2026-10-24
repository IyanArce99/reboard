import Image from "next/image";
import { PHOTOS, type PhotoSlug } from "@/lib/photos";

interface Props {
  slug: PhotoSlug;
  /** `sizes` de next/image según el hueco que ocupa. */
  sizes: string;
  className?: string;
  /** Solo para la imagen LCP de la página: se pide la primera y con prioridad alta. */
  preload?: boolean;
  /** Rellena el contenedor (que debe tener position y tamaño). Por defecto, true. */
  fill?: boolean;
  /** Foto decorativa (el contenido ya lo explica el texto): alt vacío. */
  decorative?: boolean;
  /** Encuadre: object-position. */
  position?: string;
}

/** Fotografía editorial (Pexels, ver src/lib/photos.ts). Nunca representa un anuncio. */
export function Photo({ slug, sizes, className, preload = false, fill = true, decorative = false, position }: Props) {
  const p = PHOTOS[slug];
  const common = {
    src: p.src,
    alt: decorative ? "" : p.alt,
    sizes,
    className,
    placeholder: "blur" as const,
    blurDataURL: p.blurDataURL,
    // Next 16 recomienda fetchPriority/loading en vez de `preload` (que añade un <link> y no da
    // prioridad: el LCP de la home tardaba 4,2 s en Lighthouse móvil).
    ...(preload ? { fetchPriority: "high" as const, loading: "eager" as const } : {}),
    quality: 70,
    style: { objectFit: "cover" as const, objectPosition: position },
  };
  // `alt` explícito (también va en `common`): así el linter de accesibilidad lo ve.
  return fill ? (
    <Image {...common} alt={common.alt} fill />
  ) : (
    <Image {...common} alt={common.alt} width={p.width} height={p.height} />
  );
}
