import Link from "next/link";
import { getRepository } from "@/lib/data";
import { LAUNCH, placeName } from "@/lib/domain/taxonomy";
import { landingIndexable } from "@/lib/search/indexing";
import { LANDING_FORMS, LANDING_PLACES, formLabel, landingFilters, landingPath, type LandingForm } from "@/lib/search/landings";
import styles from "./Search.module.css";

interface LinkItem {
  href: string;
  label: string;
  n: number;
}

/**
 * Enlazado entre landings (SEO programático y navegación): desde una zona, sus tipos; desde un
 * tipo, sus zonas; desde una combinación, la zona, el tipo y la misma forma en otras zonas.
 * Solo enlaza landings indexables según la misma política que el sitemap.
 */
export async function RelatedLandings({ place, form }: { place: string | null; form: LandingForm | null }) {
  const repo = getRepository();
  // Solo lugares del territorio activo con landing propia (las 8 islas).
  const zones = LANDING_PLACES;
  const candidates: { group: string; place: string | null; form: LandingForm | null; label: string }[] = [];

  if (place) {
    for (const f of LANDING_FORMS) if (f !== form) candidates.push({ group: `Por tipo en ${placeName(place)}`, place, form: f, label: formLabel(f) });
  }
  if (form) {
    for (const p of zones) if (p !== place) candidates.push({ group: `${formLabel(form)} en otras ${LAUNCH.zoneNoun}s`, place: p, form, label: placeName(p)! });
  }
  if (place && form) {
    candidates.push({ group: "Ampliar la búsqueda", place, form: null, label: `Todas las tablas en ${placeName(place)}` });
    candidates.push({ group: "Ampliar la búsqueda", place: null, form, label: `${formLabel(form)} ${LAUNCH.inAll}` });
  }
  if (!candidates.length) return null;

  const counts = await Promise.all(candidates.map((c) => repo.count(landingFilters(c.place, c.form))));
  const groups = new Map<string, LinkItem[]>();
  candidates.forEach((c, i) => {
    if (!landingIndexable(c.place, c.form, counts[i])) return;
    const list = groups.get(c.group) ?? [];
    list.push({ href: landingPath(c.place, c.form), label: c.label, n: counts[i] });
    groups.set(c.group, list);
  });
  if (!groups.size) return null;

  return (
    <nav className={styles.related} aria-labelledby="related-title">
      <h2 id="related-title" className={styles.relatedTitle}>
        Más tablas de segunda mano
      </h2>
      <div className={styles.relatedGroups}>
        {[...groups].map(([group, items]) => (
          <div key={group}>
            <h3 className={styles.relatedGroup}>{group}</h3>
            <ul className={styles.relatedList}>
              {items.map((it) => (
                <li key={it.href}>
                  <Link href={it.href}>
                    {it.label} <span>{it.n}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}
