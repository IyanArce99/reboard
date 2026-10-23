// Utilidades de tiendas y escuelas (sin dependencias de servidor).

import { zoneLabel } from "@/lib/domain/taxonomy";
import type { Listing, Shop } from "@/lib/domain/types";

export const shopPath = (s: Shop) => `/tiendas/${s.slug}`;

export const SHOP_TYPE_LABEL: Record<Shop["type"], string> = { tienda: "Tienda", escuela: "Escuela" };

export const isOfShop = (l: Listing, s: Shop) =>
  l.seller.shopSlug ? l.seller.shopSlug === s.slug : l.seller.type !== "particular" && l.seller.name === s.name;

export const shopPlace = (s: Shop) => `${s.town}, ${zoneLabel(s.zone)}`;

export const usedBoards = (n: number) => (n ? `${n} tabla${n > 1 ? "s" : ""} usada${n > 1 ? "s" : ""}` : "Sin tablas usadas ahora");
