"use client";

// Paso 4 · Precio y ubicación: el precio manda; «¿Dónde está la tabla?» con la isla (chips, solo el territorio activo,
// LAUNCH) y la localidad con sugerencias discretas de la isla (nunca una dirección exacta); contacto por WhatsApp o llamada
// con el teléfono privado (solo lo ve quien pulsa «Mostrar contacto»).

import { LAUNCH, ZONES, zoneBySlug } from "@/lib/domain/taxonomy";
import { eur } from "@/lib/domain/format";
import type { CatalogModel } from "@/lib/domain/types";
import type { ContactMethod } from "@/lib/publish/draft";
import { Chip, Group, type StepProps } from "./parts";
import styles from "./Publish.module.css";

// Contacto directo por WhatsApp o teléfono (decisión aprobada; la base de datos solo admite estos dos).
const CONTACTS: [ContactMethod, string][] = [
  ["whatsapp", "WhatsApp y llamadas"],
  ["phone", "Solo llamadas"],
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

      <Group id="pub-where" title="¿Dónde está la tabla?" hint="Solo mostramos la isla y la localidad, nunca tu dirección.">
        <div className={styles.whereBlock} role="group" aria-labelledby="pub-zone">
          <span id="pub-zone" className={styles.subLabel}>
            {LAUNCH.zoneTitle}
          </span>
          <div className={styles.chips}>
            {ZONES.map((z) => (
              <Chip key={z.slug} on={d.zone === z.slug} onClick={() => pickZone(z.slug)}>
                {z.name}
              </Chip>
            ))}
          </div>
        </div>

        <div className={styles.whereBlock}>
          <label htmlFor="pub-town" className={styles.subLabel}>
            Localidad
          </label>
          <input
            id="pub-town"
            className={styles.text}
            placeholder={zone ? `Por ejemplo, ${zone.towns[0]}` : "Tu pueblo o ciudad"}
            autoComplete="address-level2"
            maxLength={80}
            value={d.town}
            onChange={(e) => set({ town: e.target.value })}
          />
          {/* Sugerencias de la isla: discretas, para no competir con la elección de isla. */}
          {zone && (
            <div className={styles.townSuggest} role="group" aria-label={`Localidades habituales de ${zone.name}`}>
              {zone.towns.map((t) => (
                <button key={t} type="button" aria-pressed={d.town === t} className={styles.townChip} onClick={() => set({ town: t })}>
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>
      </Group>

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
            No aparece escrito en el anuncio: solo lo ve quien lo pide desde tu anuncio, y está protegido contra robots.
            {!live && " Todavía no se guarda."}
          </span>
        </div>
      </div>
    </div>
  );
}
