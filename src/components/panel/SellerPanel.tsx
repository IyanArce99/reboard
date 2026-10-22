"use client";

// Panel del vendedor (design/prototype/Reboard.dc.html, pantalla «panel», y proVals()
// en design/source/prototype-logic.js).
// ⚠️ DEMO: los anuncios son del inventario simulado y las acciones solo cambian el estado
// local de este dispositivo (panelStore.ts). Las estadísticas son SIMULADAS.

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useUserState } from "@/components/user/UserStateProvider";
import { SHAPE_INFO } from "@/lib/domain/taxonomy";
import type { Listing } from "@/lib/domain/types";
import { ago, daysBetween, eur } from "@/lib/domain/format";
import { listingPath, listingTitle } from "@/lib/listing/present";
import ui from "@/styles/ui.module.css";
import { readPanelState, writePanelState, type OwnOverride, type PanelState } from "./panelStore";
import styles from "./Panel.module.css";

type Tab = "activos" | "pendientes" | "vendidos";
const TABS: [Tab, string][] = [
  ["activos", "Activos"],
  ["pendientes", "Pendientes"],
  ["vendidos", "Vendidos"],
];

/** Días sin confirmar a partir de los que el anuncio pasa a «pendiente» (docs/PRODUCT.md). */
const CONFIRM_DAYS = 14;
const MIN_PRICE = 50;

// Estadísticas SIMULADAS, deterministas por id (como hash() del prototipo). No son datos reales.
const hash = (s: string) => {
  let x = 0;
  for (const c of s) x = (x * 31 + c.charCodeAt(0)) % 9973;
  return x;
};

export function SellerPanel({ listings, nowIso }: { listings: Listing[]; nowIso: string }) {
  const { toast } = useUserState();
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const [over, setOver] = useState<PanelState>({});
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("activos");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    // localStorage solo existe en el cliente: se carga tras hidratar.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOver(readPanelState());
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) writePanelState(over);
  }, [over, ready]);

  const own = listings.map((l) => {
    const o = over[l.id] ?? {};
    return { ...l, status: o.status ?? l.status, confirmedAt: o.confirmedAt ?? l.confirmedAt, price: o.price ?? l.price };
  });
  const confDays = (l: Listing) => daysBetween(l.confirmedAt, now);
  const tabOf = (l: Listing): Tab =>
    l.status === "vendida" ? "vendidos" : l.status === "pendiente" || confDays(l) > CONFIRM_DAYS ? "pendientes" : "activos";

  const setOwn = (id: string, p: OwnOverride) => setOver((s) => ({ ...s, [id]: { ...s[id], ...p } }));
  const confirm = (id: string) => setOwn(id, { status: "disponible", confirmedAt: now.toISOString() });

  const pend = own.filter((l) => tabOf(l) === "pendientes");
  const rows = own.filter((l) => tabOf(l) === tab);

  const onTabKey = (e: React.KeyboardEvent, i: number) => {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    const n = (i + d + TABS.length) % TABS.length;
    setTab(TABS[n][0]);
    tabRefs.current[n]?.focus();
  };

  return (
    <main className={`container ${styles.page}`}>
      <div className={styles.head}>
        <div>
          <div className={styles.who}>
            Mi panel · vendedor de demostración <span className={ui.demoTag}>DEMO</span>
          </div>
          <h1 className={`${ui.h1} ${styles.h1}`}>Mis anuncios</h1>
        </div>
        <Link href="/vender/publicar" className={styles.newBtn}>
          Publicar otra tabla
        </Link>
      </div>

      {pend.length > 0 && (
        <div className={styles.need} role="status">
          <span>
            {pend.length} anuncio{pend.length > 1 ? "s" : ""} sin confirmar desde hace más de {CONFIRM_DAYS} días. Si no lo
            confirmas, caducará a los 30.
          </span>
          <button
            type="button"
            className={styles.needBtn}
            onClick={() => {
              pend.forEach((l) => confirm(l.id));
              toast("Todas confirmadas (demo: solo en este dispositivo)");
            }}
          >
            Confirmar todas
          </button>
        </div>
      )}

      <div data-rail="1" role="tablist" aria-label="Estado de los anuncios" className={styles.tabs}>
        {TABS.map(([v, l], i) => (
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
          const k = hash(l.id);
          const sold = l.status === "vendida";
          const t = tabOf(l);
          const photo = l.photos[0];
          const st = sold
            ? "Vendida · ya no aparece en búsquedas"
            : t === "pendientes"
              ? `Pendiente: confirma que sigue disponible (última vez ${ago(confDays(l))})`
              : `Activa · confirmada ${ago(confDays(l))}`;
          const tone = sold ? ui.dotError : t === "pendientes" ? ui.dotWarning : ui.dotSuccess;
          return (
            <article key={l.id} className={styles.row}>
              <div className={styles.thumb} data-off={sold || undefined}>
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
                  {st}
                </div>
                <div className={styles.stats}>
                  <span>{40 + (k % 300)} visitas</span>
                  <span>{k % 17} guardados</span>
                  <span>{k % 6} clics en contactar</span>
                  <span className={styles.simTag}>simuladas (demo)</span>
                </div>
              </div>
              <div className={styles.actions}>
                {sold ? (
                  <>
                    <Link href={listingPath(l)} className={styles.act}>
                      Ver anuncio
                    </Link>
                    <button
                      type="button"
                      className={styles.act}
                      onClick={() => {
                        confirm(l.id);
                        toast("Demo: vuelve a estar activa solo en este dispositivo");
                      }}
                    >
                      Volver a publicar
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className={styles.act}
                      data-primary={t === "pendientes" || undefined}
                      onClick={() => {
                        confirm(l.id);
                        toast("Disponibilidad confirmada hoy");
                      }}
                    >
                      {t === "pendientes" ? "Sigue disponible" : "Confirmar disponibilidad"}
                    </button>
                    <button
                      type="button"
                      className={styles.act}
                      disabled={l.price <= MIN_PRICE}
                      onClick={() => {
                        setOwn(l.id, { price: Math.max(MIN_PRICE, l.price - 10) });
                        toast("Precio bajado 10 € (demo: solo en este dispositivo)");
                      }}
                    >
                      Bajar precio
                    </button>
                    <Link href={`/vender/publicar?editar=${l.id}`} className={styles.act}>
                      Editar
                    </Link>
                    <button
                      type="button"
                      className={styles.act}
                      onClick={() => {
                        setOwn(l.id, { status: "vendida" });
                        toast("Marcada como vendida (demo: solo en este dispositivo)");
                      }}
                    >
                      Marcar vendida
                    </button>
                  </>
                )}
              </div>
            </article>
          );
        })}
        {rows.length === 0 && <div className={styles.empty}>No tienes anuncios en esta pestaña.</div>}
      </div>

      <p className={styles.foot}>
        Estadísticas simuladas para la demostración: no son visitas reales. Solo mostraremos los contactos que podamos medir
        (clics en WhatsApp o teléfono); no hay chat propio. Los cambios de este panel se guardan solo en este dispositivo.
      </p>
    </main>
  );
}
