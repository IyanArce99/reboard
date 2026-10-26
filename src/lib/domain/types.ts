import type {
  Condition,
  Construction,
  ListingStatus,
  SellerType,
  Shape,
} from "./taxonomy";

/**
 * Origen de un dato técnico. Es obligatorio en el modelo (CLAUDE.md):
 * - 'seller': confirmado por el vendedor.
 * - 'manufacturer': según el fabricante (variante de catálogo confirmada).
 * - null: sin indicar. El valor también es null; nunca se inventa.
 */
export type DataSource = "seller" | "manufacturer" | null;

export interface Measured<T> {
  value: T | null;
  source: DataSource;
}

export interface Photo {
  url: string;
  /** Qué muestra la foto: cubierta, fondo, cola y quillas… */
  label: string;
}

export interface Seller {
  /** Id del perfil (null en los datos DEMO). */
  id: string | null;
  type: SellerType;
  name: string;
  /** Slug del perfil de tienda o escuela, si tiene. */
  shopSlug: string | null;
}

/** Por dónde acepta contactos el vendedor: teléfono (WhatsApp o llamada), email a través de Reboard o los dos. */
export type ContactChannels = "phone" | "email" | "both";

export interface ContactInfo {
  method: "whatsapp" | "phone" | "email";
  /** Canales que acepta. El email del vendedor nunca está aquí: solo lo lee el servidor al enviar. */
  channels: ContactChannels;
  /** Teléfono en formato internacional sin «+». null hasta que exista el backend. */
  phone: string | null;
}

export interface Listing {
  id: string;
  /** Slug de la URL /anuncio/[slug-id], sin el id. */
  slug: string;
  brand: string | null;
  model: string | null;
  modelSlug: string | null;
  /** Medida tal como se anuncia, p. ej. 7'2". */
  sizeLabel: string;
  /** Pulgadas. */
  length: Measured<number>;
  width: Measured<number>;
  thickness: Measured<number>;
  /** Litros. */
  volume: Measured<number>;
  shape: Shape;
  shapeSource: DataSource;
  construction: Construction;
  constructionSource: DataSource;
  fins: Measured<string>;
  accessories: Measured<string>;
  zone: string;
  town: string;
  /**
   * Distancia al centro de la zona, en km.
   * DEMO: en el prototipo es simulada. La geolocalización real está pendiente (docs/ROADMAP.md).
   */
  distanceKm: number | null;
  price: number;
  previousPrice: number | null;
  condition: Condition;
  repairs: string | null;
  seller: Seller;
  contact: ContactInfo;
  status: ListingStatus;
  publishedAt: string;
  /** Marcada como reservada por el vendedor (sigue publicada y se puede contactar). */
  reservedAt: string | null;
  confirmedAt: string;
  photos: Photo[];
  description: string;
  /** true en los datos simulados: nunca deben presentarse como anuncios reales. */
  isDemo: boolean;
}

export interface CatalogSize {
  label: string;
  lengthIn: number;
  widthIn: number;
  thickIn: number;
  /** Litros publicados por el fabricante; null si no los publica. */
  volume: number | null;
}

export interface CatalogModel {
  brand: string;
  model: string;
  slug: string;
  shape: Shape;
  construction: Construction;
  sizes: CatalogSize[];
  description: string | null;
}

export interface Shop {
  name: string;
  slug: string;
  type: "tienda" | "escuela";
  zone: string;
  town: string;
  address: string;
  hours: string;
  image: string;
  inventorySource: string;
}
