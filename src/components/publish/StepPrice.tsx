"use client";

// Paso 4 · Precio y ubicación: el precio manda; zona con chips (Canarias / Península), localidad
// con sugerencias de la zona (nunca una dirección exacta) y contacto por WhatsApp o llamada
// con el teléfono privado (solo lo ve quien pulsa «Mostrar contacto»).

import { REGIONS, ZONES, zoneBySlug } from "@/lib/domain/taxonomy";
import { eur } from "@/lib/domain/format";
import type { CatalogModel } from "@/lib/domain/types";
import type { ContactMethod } from "@/lib/publish/draft";
import ui from "@/styles/ui.module.css";
import { Chip, Group, type StepProps } from "./parts";
import styles from "./Publish.module.css";

// Contacto directo por WhatsApp o teléfono (decisión aprobada; la base de datos solo admite estos dos).
const CONTACTS: [ContactMethod, string][] = [
  ["whatsapp", "WhatsApp"],
  ["phone", "Llamada"],
];

const ISLANDS = REGIONS.find((r) => r.slug === "canarias")?.zones ?? [];
const ZONE_GROUPS = [
  { name: "Canarias", zones: ZONES.filter((z) => ISLANDS.includes(z.slug)) },
  { name: "Península", zones: ZONES.filter((z) => !ISLANDS.includes(z.slug)) },
];

interface Props extends StepProps {
  model: CatalogModel | undefined;
  refs: number[];
  dataIsDemo: boolean;
  live: boolean;
}

export function StepPrice({ d, set, model, refs, dataIsDemo, live }: Props) {
  const zone = zoneBySlug(d.zone);
  const pickZone = (slug: string) => {
    // Si la localidad era una sugerencia de la zona anterior, deja de tener sentido.
    const stale = zone?.towns.includes(d.town.trim());
    set({ zone: slug, ...(stale ? { town: "" } : {}) });
  };

  return (
    <div className={styles.stepBody}>
      <div className={styles.priceBox}>
        <label htmlFor="pub-price" className={styles.groupTitle}>
          Precio
        </label>
        <div className={styles.priceWrap}>
          <input
            id="pub-price"
            inputMode="numeric"
            placeholder="0"
            autoComplete="off"
            className={styles.priceInput}
            value={d.price}
            aria-describedby={model && refs.length > 0 ? "pub-price-ref" : undefined}
            onChange={(e) => set({ price: e.target.value.replace(/[^0-9]/g, "").slice(0, 5) })}
          />
          <span className={styles.priceEur} aria-hidden="true">
            €
          </span>
        </div>
        {model && refs.length > 0 ? (
          <p id="pub-price-ref" className={styles.small}>
            Otras {model.brand} {model.model} publicadas: entre {eur(Math.min(...refs))} y {eur(Math.max(...refs))} ({refs.length})
            {dataIsDemo ? " · anuncios de demostración" : ""}.
          </p>
        ) : (
          <p className={styles.small}>Sin comisiones: lo que pongas es lo que cobras.</p>
        )}
      </div>

      <Group id="pub-zone" title="Zona" hint="De momento solo publicamos en estas zonas.">
        {ZONE_GROUPS.map((g) => (
          <div key={g.name} className={styles.zoneGroup}>
            <span className={styles.zoneName}>{g.name}</span>
            <div className={styles.chips}>
              {g.zones.map((z) => (
                <Chip key={z.slug} on={d.zone === z.slug} onClick={() => pickZone(z.slug)}>
                  {z.name}
                </Chip>
              ))}
            </div>
          </div>
        ))}
      </Group>

      <div className={styles.labelField}>
        <label htmlFor="pub-town">Localidad</label>
        <input
          id="pub-town"
          className={styles.text}
          placeholder={zone?.towns[0] ?? "Tu localidad"}
          list="pub-towns"
          autoComplete="address-level2"
          maxLength={80}
          value={d.town}
          aria-describedby="pub-town-help"
          onChange={(e) => set({ town: e.target.value })}
        />
        <datalist id="pub-towns">
          {zone?.towns.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
        {zone && (
          <div className={styles.chips} role="group" aria-label={`Localidades de ${zone.name}`}>
            {zone.towns.map((t) => (
              <button key={t} type="button" aria-pressed={d.town === t} className={`${ui.chip} ${ui.chipSm} ${styles.townChip}`} onClick={() => set({ town: t })}>
                {t}
              </button>
            ))}
          </div>
        )}
        <span id="pub-town-help" className={styles.small}>
          Solo mostramos la localidad, nunca tu dirección.
        </span>
      </div>

      <div className={styles.contactBox}>
        <Group id="pub-contact" title="¿Cómo quieres que te contacten?">
          <div className={styles.segmented}>
            {CONTACTS.map(([v, l]) => (
              <button key={v} type="button" aria-pressed={d.contact === v} className={styles.segment} onClick={() => set({ contact: v })}>
                {l}
              </button>
            ))}
          </div>
        </Group>
        <div className={styles.labelField}>
          <label htmlFor="pub-phone">Tu teléfono</label>
          <input
            id="pub-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="600 000 000"
            className={styles.phoneInput}
            value={d.phone}
            aria-describedby="pub-phone-help"
            onChange={(e) => set({ phone: e.target.value })}
          />
          <span id="pub-phone-help" className={styles.small}>
            No aparece escrito en el anuncio: lo ve quien pulsa «Mostrar contacto», con protección contra robots.
            {!live && " Demo: no se guarda."}
          </span>
        </div>
      </div>
    </div>
  );
}
