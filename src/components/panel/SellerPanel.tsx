"use client";

// Panel del vendedor (design/prototype/Reboard.dc.html, pantalla «panel», y proVals()
// en design/source/prototype-logic.js).
// - Con cuenta (`live`): sus anuncios reales; las acciones van a la base de datos
//   (src/app/vender/actions.ts) y se ven al momento en las búsquedas.
// - DEMO: anuncios simulados; las acciones solo cambian este dispositivo (panelStore.ts). Sin
//   estadísticas: CLAUDE.md prohíbe inventarlas, aunque sea con etiqueta de demo.

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { deleteListingServer, panelActionServer } from "@/app/vender/actions";
import { EmptyState } from "@/components/brand/EmptyState";
import { useUserState } from "@/components/user/UserStateProvider";
import { SHAPE_INFO } from "@/lib/domain/taxonomy";
import type { Listing } from "@/lib/domain/types";
import { ago, daysBetween, eur } from "@/lib/domain/format";
import { listingPath, listingTitle } from "@/lib/listing/present";
import type { PanelAction } from "@/lib/publish/save";
import ui from "@/styles/ui.module.css";
import { readPanelState, writePanelState, type OwnOverride, type PanelState } from "./panelStore";
import styles from "./Panel.module.css";

type Tab = "activos" | "pendientes" | "vendidos" | "inactivos";
const TABS: [Tab, string][] = [
  ["activos", "Activos"],
  ["pendientes", "Pendientes"],
  ["vendidos", "Vendidos"],
  ["inactivos", "Caducados y retirados"],
];

/** Días sin confirmar a partir de los que el anuncio pasa a «pendiente» (docs/PRODUCT.md). */
const CONFIRM_DAYS = 14;
const MIN_PRICE = 1;

const DONE_TEXT: Record<PanelAction, string> = {
  confirm: "Disponibilidad confirmada hoy",
  sold: "Marcada como vendida: ya no aparece en las búsquedas",
  republish: "Publicada de nuevo",
  withdraw: "Anuncio retirado",
  price: "Precio actualizado",
};

interface Props {
  listings: Listing[];
  nowIso: string;
  live?: boolean;
  sellerName?: string;
  /** Contactos reales por anuncio (clics en «Mostrar contacto»). */
  contacts?: Record<string, number>;
}

export function SellerPanel({ listings, nowIso, live = false, sellerName, contacts = {} }: Props) {
  const { toast } = useUserState();
  const router = useRouter();
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const [over, setOver] = useState<PanelState>({});
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("activos");
  const [busy, setBusy] = useState<string | null>(null);
  const [pricing, setPricing] = useState<{ id: string; value: string; error?: string } | null>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (live) return;
    // localStorage solo existe en el cliente: se carga tras hidratar.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOver(readPanelState());
    setReady(true);
  }, [live]);

  useEffect(() => {
    if (ready && !live) writePanelState(over);
  }, [over, ready, live]);

  const own = live
    ? listings
    : listings.map((l) => {
        const o = over[l.id] ?? {};
        return { ...l, status: o.status ?? l.status, confirmedAt: o.confirmedAt ?? l.confirmedAt, price: o.price ?? l.price };
      });
  const confDays = (l: Listing) => daysBetween(l.confirmedAt, now);
  const tabOf = (l: Listing): Tab => {
    if (l.status === "vendida") return "vendidos";
    if (l.status === "retirada" || l.status === "caducada") return "inactivos";
    return l.status === "pendiente" || confDays(l) > CONFIRM_DAYS ? "pendientes" : "activos";
  };

  const setOwn = (id: string, p: OwnOverride) => setOver((s) => ({ ...s, [id]: { ...s[id], ...p } }));

  async function run(l: Listing, action: PanelAction, price?: number) {
    if (!live) {
      const demo: Record<PanelAction, OwnOverride> = {
        confirm: { status: "disponible", confirmedAt: now.toISOString() },
        sold: { status: "vendida" },
        republish: { status: "disponible", confirmedAt: now.toISOString() },
        withdraw: { status: "retirada" },
        price: { price },
      };
      setOwn(l.id, demo[action]);
      toast(`${DONE_TEXT[action]} (demo: solo en este dispositivo)`);
      return;
    }
    setBusy(l.id);
    const r = await panelActionServer({ publicId: l.id, action, price });
    setBusy(null);
    if (!r.ok) {
      toast(r.message);
      if (r.login) router.push("/entrar?siguiente=/panel");
      return;
    }
    toast(DONE_TEXT[action]);
    router.refresh();
  }

  async function remove(l: Listing) {
    if (!window.confirm("¿Eliminar el anuncio y sus fotos? No se puede deshacer. Si solo quieres que deje de verse, mejor retíralo.")) return;
    setBusy(l.id);
    const r = await deleteListingServer({ publicId: l.id });
    setBusy(null);
    if (!r.ok) {
      toast(r.message);
      if (r.login) router.push("/entrar?siguiente=/panel");
      return;
    }
    toast("Anuncio y fotos eliminados.");
    router.refresh();
  }

  const pend = own.filter((l) => tabOf(l) === "pendientes");
  const rows = own.filter((l) => tabOf(l) === tab);
  const tabs = TABS.filter(([v]) => v !== "inactivos" || own.some((l) => tabOf(l) === "inactivos"));

  const onTabKey = (e: React.KeyboardEvent, i: number) => {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    const n = (i + d + tabs.length) % tabs.length;
    setTab(tabs[n][0]);
    tabRefs.current[n]?.focus();
  };

  const statusText = (l: Listing, t: Tab) => {
    if (l.status === "vendida") return "Vendida · ya no aparece en búsquedas";
    if (l.status === "retirada") return "Retirada · no aparece en búsquedas";
    if (l.status === "caducada") return "Caducada · pasaron 30 días sin confirmarla";
    if (t === "pendientes") return `Confirma que sigue a la venta · última vez ${ago(confDays(l))}`;
    return `Activa · confirmada ${ago(confDays(l))}`;
  };

  return (
    <main className={`container ${styles.page}`}>
      <div className={styles.head}>
        <div>
          <div className={styles.who}>
            {live ? (
              <>Cuenta · {sellerName}</>
            ) : (
              <>
                Vendedor de demostración <span className={ui.demoTag}>DEMO</span>
              </>
            )}
          </div>
          <h1 className={`${ui.h1} ${styles.h1}`}>Mis anuncios</h1>
        </div>
        <Link href="/vender/publicar" className={styles.newBtn}>
          {own.length ? "Publicar otra tabla" : "Publicar una tabla"}
        </Link>
      </div>

      {pend.length > 0 && (
        <div className={styles.need} role="status">
          <span>
            {pend.length > 1
              ? `Tienes ${pend.length} anuncios sin confirmar desde hace más de ${CONFIRM_DAYS} días. Si siguen a la venta, confírmalos: a los 30 días sin confirmar, caducan.`
              : `Tienes 1 anuncio sin confirmar desde hace más de ${CONFIRM_DAYS} días. Si sigue a la venta, confírmalo: a los 30 días sin confirmar, caduca.`}
          </span>
          <button
            type="button"
            className={styles.needBtn}
            disabled={!!busy}
            onClick={async () => {
              for (const l of pend) await run(l, "confirm");
            }}
          >
            {pend.length > 1 ? "Confirmar todos" : "Confirmar"}
          </button>
        </div>
      )}

      {own.length === 0 ? (
        <EmptyState
          title="Aún no tienes anuncios"
          actions={
            <Link href="/vender/publicar" className={ui.btnPrimary}>
              Publicar mi tabla
            </Link>
          }
        >
          Publicar es gratis y se hace en unos minutos: fotos, medidas, estado y precio.
        </EmptyState>
      ) : (
        <>
          <div data-rail="1" role="tablist" aria-label="Estado de los anuncios" className={styles.tabs}>
            {tabs.map(([v, l], i) => (
              <button
                key={v}
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                type="button"
                role="tab"
                id={`panel-tab-${v}`}
                aria-controls="panel-rows"
                aria-selected={tab === v}
                tabIndex={tab === v ? 0 : -1}
                className={styles.tab}
                onClick={() => setTab(v)}
                onKeyDown={(e) => onTabKey(e, i)}
              >
                {l} · {own.filter((x) => tabOf(x) === v).length}
              </button>
            ))}
          </div>

          <div id="panel-rows" role="tabpanel" aria-labelledby={`panel-tab-${tab}`} className={styles.rows}>
            {rows.map((l) => {
              const t = tabOf(l);
              const off = t === "vendidos" || t === "inactivos";
              const photo = l.photos[0];
              const tone = off ? ui.dotError : t === "pendientes" ? ui.dotWarning : ui.dotSuccess;
              const working = busy === l.id;
              return (
                <article key={l.id} className={styles.row} aria-busy={working || undefined}>
                  <div className={styles.thumb} data-off={off || undefined}>
                    {photo && <Image src={photo.url} alt="" fill sizes="96px" className={styles.thumbImg} />}
                  </div>
                  <div className={styles.info}>
                    <div className={styles.titleRow}>
                      <span className={styles.price}>{eur(l.price)}</span>
                      <Link href={listingPath(l)} className={styles.title}>
                        {listingTitle(l)}
                      </Link>
                    </div>
                    <div className={styles.spec}>
                      {l.volume.value != null ? `${l.volume.value} L` : "Litros sin indicar"} · {SHAPE_INFO[l.shape].label} · {l.town}
                    </div>
                    <div className={styles.status}>
                      <span className={`${ui.dot} ${tone}`} style={{ width: 8, height: 8 }} />
                      {statusText(l, t)}
                    </div>
                    {live && (
                      <div className={styles.stats}>
                        <span>
                          Contacto mostrado {contacts[l.id] ?? 0} {contacts[l.id] === 1 ? "vez" : "veces"}
                        </span>
                      </div>
                    )}
                    {pricing?.id === l.id && (
                      <form
                        className={styles.priceForm}
                        onSubmit={(e) => {
                          e.preventDefault();
                          const v = Number(pricing.value);
                          if (!Number.isInteger(v) || v < MIN_PRICE || v > 20000) {
                            // Mensaje fijo bajo el campo, como en publicar (no un toast que desaparece).
                            setPricing({ ...pricing, error: "Indica un precio entre 1 y 20.000 €." });
                            return;
                          }
                          setPricing(null);
                          void run(l, "price", v);
                        }}
                      >
                        <label htmlFor={`precio-${l.id}`} className={styles.priceLabel}>
                          Nuevo precio (€)
                        </label>
                        <input
                          id={`precio-${l.id}`}
                          inputMode="numeric"
                          className={ui.input}
                          value={pricing.value}
                          aria-invalid={pricing.error ? true : undefined}
                          aria-describedby={`precio-${l.id}-error`}
                          onChange={(e) => setPricing({ id: l.id, value: e.target.value.replace(/\D/g, "").slice(0, 5) })}
                        />
                        <button type="submit" className={styles.act} data-primary>
                          Guardar
                        </button>
                        <button type="button" className={styles.act} onClick={() => setPricing(null)}>
                          Cancelar
                        </button>
                        <p id={`precio-${l.id}-error`} className={styles.priceError} role="alert">
                          {pricing.error}
                        </p>
                      </form>
                    )}
                  </div>
                  <div className={styles.actions}>
                    {off ? (
                      <>
                        <Link href={listingPath(l)} className={styles.act}>
                          Ver anuncio
                        </Link>
                        <button type="button" className={styles.act} disabled={working} onClick={() => void run(l, "republish")}>
                          Volver a publicar
                        </button>
                        {live && (
                          <button type="button" className={styles.act} data-danger disabled={working} onClick={() => void remove(l)}>
                            Eliminar
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className={styles.act}
                          data-primary={t === "pendientes" || undefined}
                          disabled={working}
                          onClick={() => void run(l, "confirm")}
                        >
                          {t === "pendientes" ? "Sigue disponible" : "Confirmar disponibilidad"}
                        </button>
                        <button
                          type="button"
                          className={styles.act}
                          disabled={working}
                          onClick={() => setPricing({ id: l.id, value: String(l.price) })}
                        >
                          Cambiar precio
                        </button>
                        <Link href={`/vender/publicar?editar=${l.id}`} className={styles.act}>
                          Editar
                        </Link>
                        <button
                          type="button"
                          className={styles.act}
                          disabled={working}
                          onClick={() => {
                            if (window.confirm("¿Marcar como vendida? Dejará de aparecer en las búsquedas.")) void run(l, "sold");
                          }}
                        >
                          Marcar vendida
                        </button>
                        <button
                          type="button"
                          className={styles.act}
                          disabled={working}
                          onClick={() => {
                            if (window.confirm("¿Retirar el anuncio? Podrás volver a publicarlo cuando quieras.")) void run(l, "withdraw");
                          }}
                        >
                          Retirar
                        </button>
                        {live && (
                          <button type="button" className={styles.act} data-danger disabled={working} onClick={() => void remove(l)}>
                            Eliminar
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </article>
              );
            })}
            {rows.length === 0 && <div className={styles.empty}>No tienes anuncios en esta pestaña.</div>}
          </div>
        </>
      )}

      <p className={styles.foot}>
        {live
          ? "Confirma cada anuncio al menos cada 14 días: si pasan 30 sin confirmarlo, caduca. No enviamos recordatorios. Los cambios se ven al momento en las búsquedas y, si bajas el precio, la ficha muestra el anterior tachado. Lo único que contamos es cuántas veces han pulsado «Mostrar contacto»."
          : "En la demo no hay estadísticas. Con datos reales, lo único que contamos es cuántas veces han pulsado «Mostrar contacto». Los cambios de este panel se guardan solo en este dispositivo."}
      </p>
    </main>
  );
}
