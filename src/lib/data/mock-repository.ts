import "server-only";
import { isActiveStatus } from "@/lib/domain/taxonomy";
import type { Listing } from "@/lib/domain/types";
import {
  DEMO_CATALOG,
  DEMO_REFERENCE_DATE,
  DEMO_SHOPS,
  buildDemoInventory,
} from "@/mocks/demo-inventory";
import type { ListingRepository } from "./repository";

/** Tamaños del inventario demo, como el selector «Inventario» del prototipo. */
const SIZES = [20, 100, 1000];

function demoSize() {
  const n = Number(process.env.REBOARD_DEMO_INVENTORY ?? 100);
  return SIZES.includes(n) ? n : 100;
}

let cache: Listing[] | null = null;
const inventory = () => (cache ??= buildDemoInventory(demoSize()));

/** Repositorio DEMO en memoria. Todo lo que devuelve lleva isDemo = true. */
export const mockRepository: ListingRepository = {
  isDemo: true,
  now: () => DEMO_REFERENCE_DATE,
  all: async () => inventory(),
  active: async () => inventory().filter((l) => isActiveStatus(l.status)),
  byId: async (id) => inventory().find((l) => l.id === id) ?? null,
  catalog: async () => DEMO_CATALOG,
  shops: async () => DEMO_SHOPS,
};
