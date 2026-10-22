import Image from "next/image";
import { PHOTOS, type PhotoSlug } from "@/lib/photos";

interface Props {
  slug: PhotoSlug;
  /** `sizes` de next/image según el hueco que ocupa. */
  sizes: string;
  className?: string;
  /** Solo para la imagen LCP de la página. */
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
    preload,
    quality: 70,
    style: { objectFit: "cover" as const, objectPosition: position },
  };
  return fill ? <Image {...common} fill /> : <Image {...common} width={p.width} height={p.height} />;
}
