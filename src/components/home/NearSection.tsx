import Link from "next/link";
import { cookies } from "next/headers";
import { ListingCard } from "@/components/listing/ListingCard";
import { AlertButton } from "@/components/user/islands";
import { getRepository } from "@/lib/data";
import { getCatalogNames } from "@/lib/data/names";
import { zoneBySlug } from "@/lib/domain/taxonomy";
import type { Listing } from "@/lib/domain/types";
import { DEFAULT_HERE, HERE_COOKIE } from "@/lib/here";
import { alertText } from "@/lib/search/describe";
import { toQuery, withFilters } from "@/lib/search/filters";
import { landingPath } from "@/lib/search/landings";
import { NearSwitcher } from "./NearSwitcher";
import styles from "./Home.module.css";

const BANDS: [number, number, string][] = [
  [0, 5, "A menos de 5 km"],
  [5, 15, "De 5 a 15 km"],
  [15, 30, "De 15 a 30 km"],
  [30, 9999, "A más de 30 km"],
];

const recent = (a: Listing, b: Listing) => +new Date(b.publishedAt) - +new Date(a.publishedAt);

export async function getHere() {
  const v = (await cookies()).get(HERE_COOKIE)?.value ?? "";
  return zoneBySlug(v) ? v : DEFAULT_HERE;
}

/** «Recién publicadas cerca de ti». Con menos de 8 cerca, añade anuncios de otras zonas, señalados. */
export async function NearSection() {
  const here = await getHere();
  const repo = getRepository();
  const [active, names] = await Promise.all([repo.active(), getCatalogNames(repo)]);
  const now = repo.now();
  const zn = zoneBySlug(here)!.name;

  const inZone = active.filter((l) => l.zone === here);
  const near = [...inZone].sort(recent).slice(0, 12);
  const other = near.length < 8 ? active.filter((l) => l.zone !== here).sort(recent).slice(0, 8 - near.length + 2) : [];
  const byKm = [...inZone].sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));
  const groups = BANDS.map(([lo, hi, l]) => ({
    label: `${l} · ${zn}`,
    items: byKm.filter((x) => (x.distanceKm ?? 9999) >= lo && (x.distanceKm ?? 9999) < hi).slice(0, 6),
  })).filter((g) => g.items.length);
  if (other.length) groups.push({ label: "Otras zonas", items: other });

  const lowInv = active.length < 60 || near.length < 8;
  const lowText =
    active.length < 60
      ? `Hay ${active.length} tablas publicadas en toda España, la mayoría en Canarias. Crea una alerta con tus medidas y te avisamos cuando aparezca una cerca.`
      : `Todavía hay pocas tablas en ${zn}. Crea una alerta y te avisamos en cuanto se publique una.`;
  const allText = `Ver ${inZone.length} en ${zn} →`;
  const zoneHref = landingPath(here, null);
  const zoneFilters = withFilters({ zone: here });

  return (
    <section className={`container ${styles.near}`} aria-labelledby="near-title">
      <NearSwitcher
        heading={
          <div>
            <h2 id="near-title" className={styles.h2}>
              Recién publicadas cerca de ti
            </h2>
            <div className={styles.nearSub}>
              {near.length} en {zn}
              {other.length ? " · y algunas de otras zonas, señaladas" : ""} · más recientes primero
            </div>
          </div>
        }
        carousel={
          <>
            {[...near, ...other].map((l, i) => (
              <div key={l.id} className={styles.railItem}>
                <ListingCard listing={l} now={now} hereZone={here} preload={i === 0} />
              </div>
            ))}
            <Link href={zoneHref} className={styles.railAll}>
              {allText}
            </Link>
          </>
        }
        list={
          <>
            {groups.map((g) => (
              <div key={g.label}>
                <div className={styles.groupLabel}>{g.label}</div>
                <div className={styles.listGrid}>
                  {g.items.map((l) => (
                    <ListingCard key={l.id} listing={l} now={now} hereZone={here} layout="horizontal" />
                  ))}
                </div>
              </div>
            ))}
            <Link href={zoneHref} className={styles.listAll}>
              {allText}
            </Link>
          </>
        }
      />
      {lowInv && (
        <div className={styles.lowInv}>
          <div>
            <strong>Reboard está empezando.</strong> {lowText}
          </div>
          <AlertButton text={alertText(zoneFilters, names)} query={toQuery(zoneFilters)} className={styles.outlineBtn} />
        </div>
      )}
    </section>
  );
}

export function NearSkeleton() {
  return (
    <section className={`container ${styles.near}`} aria-busy="true">
      <h2 className={styles.h2}>Recién publicadas cerca de ti</h2>
      <div className={styles.skeletonRail} />
    </section>
  );
}
