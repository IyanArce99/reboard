"use client";

// Paso 4 · Precio y ubicación: el precio manda; «¿Dónde está la tabla?» con la isla (chips, solo el territorio activo,
// LAUNCH) y la localidad con sugerencias discretas de la isla (nunca una dirección exacta); contacto por WhatsApp o llamada
// con el teléfono privado (solo lo ve quien pulsa «Mostrar contacto»).

import { LAUNCH, ZONES, zoneBySlug } from "@/lib/domain/taxonomy";
import { eur } from "@/lib/domain/format";
import type { CatalogModel, ContactChannels } from "@/lib/domain/types";
import type { ContactMethod } from "@/lib/publish/draft";
import { Chip, Group, type StepProps } from "./parts";
import styles from "./Publish.module.css";

// Canales de contacto: teléfono (WhatsApp o llamadas), email a través de Reboard (la dirección no se
// muestra nunca) o los dos. El email solo se ofrece si el servidor puede enviarlo (emailContact).
const CHANNELS: [ContactChannels, string, string][] = [
  ["phone", "WhatsApp o teléfono", "Tu número solo lo ve quien lo pide desde el anuncio."],
  ["email", "Correo electrónico", "Te escriben desde Reboard. Tu dirección no se muestra."],
  ["both", "Los dos", "Quien compra elige: más fácil que te escriban."],
];

// Con teléfono: WhatsApp y llamadas, o solo llamadas.
const CONTACTS: [ContactMethod, string][] = [
  ["whatsapp", "WhatsApp y llamadas"],
  ["phone", "Solo llamadas"],
];

interface Props extends StepProps {
  model: CatalogModel | undefined;
  refs: number[];
  dataIsDemo: boolean;
  live: boolean;
  emailContact?: boolean;
}

export function StepPrice({ d, set, model, refs, dataIsDemo, live, emailContact = false }: Props) {
  const channels: ContactChannels = emailContact ? (d.channels ?? "phone") : "phone";
  const usesPhone = channels !== "email";
  const usesEmail = channels !== "phone";
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
          {emailContact ? (
            <div className={styles.channelGrid}>
              {CHANNELS.map(([v, l, hint]) => (
                <button key={v} type="button" aria-pressed={channels === v} className={styles.channelOpt} onClick={() => set({ channels: v })}>
                  <span className={styles.channelCheck} aria-hidden="true" />
                  <span>
                    <span className={styles.channelLabel}>{l}</span>
                    <span className={styles.channelHint}>{hint}</span>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <ContactSegmented d={d} set={set} />
          )}
        </Group>
        {emailContact && usesPhone && (
          <div className={styles.labelField}>
            <span id="pub-phone-kind">Por teléfono</span>
            <div role="group" aria-labelledby="pub-phone-kind">
              <ContactSegmented d={d} set={set} />
            </div>
          </div>
        )}
        {usesEmail && (
          <p className={styles.emailNote} id="pub-email-note">
            Los mensajes te llegarán al email con el que entres para publicar (lo confirmas con un código). Nadie verá tu dirección:
            quien compra solo la conoce si le respondes.
          </p>
        )}
        {usesPhone && (
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
        )}
      </div>
    </div>
  );
}

function ContactSegmented({ d, set }: Pick<StepProps, "d" | "set">) {
  return (
    <div className={styles.segmented}>
      {CONTACTS.map(([v, l]) => (
        <button key={v} type="button" aria-pressed={d.contact === v} className={styles.segment} onClick={() => set({ contact: v })}>
          {l}
        </button>
      ))}
    </div>
  );
}
