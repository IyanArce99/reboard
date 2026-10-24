"use client";

// Capa única de analítica (docs/ANALYTICS.md). Todo el código de la app llama a `track()`; nadie importa
// posthog-js directamente.
//
// - PostHog EU, modo SIN COOKIES (`cookieless_mode: "always"`): no guarda nada en el navegador; PostHog
//   calcula en su servidor un identificador diario con una sal que borra cada día.
// - Se carga cuando el navegador está libre (no compite con la carga de la página) y por el dominio
//   propio (/rb-e, src/app/rb-e): los bloqueadores no lo cortan por el dominio de PostHog.
// - Tolerante a todo: sin clave, con «No rastrear» (GPC/DNT), con un bloqueador o sin red, `track()` no
//   hace nada y nunca lanza: la analítica no puede romper publicar, contactar ni navegar.
// - Sin autocapture, sin grabación de sesiones, sin mapas de calor, sin encuestas ni flags.
// - Modo depuración (NEXT_PUBLIC_ANALYTICS_DEBUG=1, solo local): no envía nada; guarda los eventos en
//   window.__rbAnalytics y los muestra en la consola, para verificarlos en los tests.

import type { PostHog, CaptureResult } from "posthog-js";
import { UNTRACKED_PATHS, cleanProps, sanitizeReferrer, sanitizeUrl, type AnalyticsEvent, type EventProps } from "./events";

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "";
const DEBUG = process.env.NEXT_PUBLIC_ANALYTICS_DEBUG === "1";
/** Ruta del proxy propio hacia PostHog EU (src/app/rb-e/[...path]/route.ts). */
export const ANALYTICS_PATH = "/rb-e";

type Queued = [string, Record<string, unknown>];
let client: PostHog | null = null;
let state: "idle" | "loading" | "ready" | "off" = "idle";
const queue: Queued[] = [];

declare global {
  interface Window {
    __rbAnalytics?: { event: string; props: Record<string, unknown> }[];
  }
}

/** La persona ha pedido que no se la rastree (Global Privacy Control o Do Not Track). */
function optedOut(): boolean {
  try {
    const nav = navigator as Navigator & { globalPrivacyControl?: boolean; doNotTrack?: string | null };
    return nav.globalPrivacyControl === true || nav.doNotTrack === "1";
  } catch {
    return false;
  }
}

const untrackedHere = () => {
  try {
    return UNTRACKED_PATHS.test(window.location.pathname);
  } catch {
    return true;
  }
};

/** URLs y referente saneados en TODOS los eventos (también los automáticos de PostHog). */
function beforeSend(ev: CaptureResult | null): CaptureResult | null {
  if (!ev) return null;
  try {
    const p = ev.properties ?? {};
    const path = typeof p.$pathname === "string" ? p.$pathname : "";
    if (UNTRACKED_PATHS.test(path)) return null;
    for (const k of ["$current_url", "$initial_current_url"]) if (k in p) p[k] = sanitizeUrl(p[k]);
    for (const k of ["$referrer", "$initial_referrer"]) if (k in p) p[k] = sanitizeReferrer(p[k]);
    // Identificadores de clic de anuncios (gclid, fbclid…): fuera.
    for (const k of Object.keys(p)) if (/clid$|^\$initial_.*clid$/.test(k)) delete p[k];
    return ev;
  } catch {
    return null;
  }
}

function load() {
  if (state !== "idle") return;
  if (!KEY || optedOut()) {
    state = "off";
    queue.length = 0;
    return;
  }
  state = "loading";
  import("posthog-js")
    .then(({ default: posthog }) => {
      posthog.init(KEY, {
        api_host: ANALYTICS_PATH,
        ui_host: "https://eu.posthog.com",
        cookieless_mode: "always",
        persistence: "memory",
        person_profiles: "never",
        // Páginas vistas: las manda la app (AnalyticsInit) con la ruta ya limpia, una por navegación.
        capture_pageview: false,
        capture_pageleave: false,
        autocapture: false,
        rageclick: false,
        capture_dead_clicks: false,
        capture_heatmaps: false,
        capture_performance: false,
        capture_exceptions: false,
        disable_session_recording: true,
        disable_surveys: true,
        disable_product_tours: true,
        disable_web_experiments: true,
        advanced_disable_flags: true,
        // Nada de scripts externos (grabación, encuestas…): la CSP solo permite los propios.
        disable_external_dependency_loading: true,
        mask_all_text: true,
        mask_all_element_attributes: true,
        before_send: beforeSend,
      });
      client = posthog;
      state = "ready";
      for (const [e, p] of queue.splice(0)) client.capture(e, p);
    })
    .catch(() => {
      // Bloqueado o sin red: la app sigue igual, sin analítica.
      state = "off";
      queue.length = 0;
    });
}

/** Arranca la analítica cuando el navegador está libre (lo llama AnalyticsInit una vez). */
export function startAnalytics() {
  if (state !== "idle" || DEBUG) return;
  try {
    const go = () => load();
    if ("requestIdleCallback" in window) window.requestIdleCallback(go, { timeout: 4000 });
    else setTimeout(go, 2500);
  } catch {
    state = "off";
  }
}

/** Registra un evento del catálogo (src/lib/analytics/events.ts). Nunca lanza. */
export function track<E extends AnalyticsEvent>(event: E, props: EventProps[E]) {
  try {
    if (typeof window === "undefined" || untrackedHere()) return;
    const clean = cleanProps(props);
    if (DEBUG) {
      (window.__rbAnalytics ??= []).push({ event, props: clean });
      console.debug("[analítica]", event, clean);
      return;
    }
    if (state === "off" || !KEY) return;
    if (state === "ready" && client) client.capture(event, clean);
    else if (queue.length < 50) queue.push([event, clean]);
  } catch {
    // La analítica nunca rompe la app.
  }
}

/** Evita repetir el mismo evento por la misma cosa en esta pestaña (doble render, volver atrás). */
const seen = new Set<string>();
export function trackOnce<E extends AnalyticsEvent>(key: string, event: E, props: EventProps[E]) {
  const k = `${event}:${key}`;
  if (seen.has(k)) return;
  seen.add(k);
  if (seen.size > 500) seen.clear();
  track(event, props);
}
