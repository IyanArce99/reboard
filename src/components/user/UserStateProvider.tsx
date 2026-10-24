"use client";

// Estado del usuario: guardados, comparación, alertas y perfil de surfista en este dispositivo
// (localStorage). Con cuenta (fase D, solo con la base de datos real) los guardados viven en la
// tabla `favorites` (RLS: cada usuario solo ve los suyos) y los del dispositivo se fusionan al entrar.
// El envío real de alertas (email/push) está pendiente (docs/ROADMAP.md).

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { listingDbId } from "@/lib/auth/shared";
import { MAX_COMPARE, sanitizeCompare, type CompareItem } from "@/lib/compare/compare";
import { hasSessionCookie, SIGNED_IN_EVENT } from "@/lib/supabase/session-hint";
import styles from "./Toast.module.css";
import { track } from "@/lib/analytics/track";

export type { CompareItem } from "@/lib/compare/compare";
export { MAX_COMPARE } from "@/lib/compare/compare";

export interface SavedAlert {
  id: string;
  text: string;
  /** Query string de /buscar con los filtros de la alerta. */
  query: string;
  on: boolean;
  createdAt: string;
}

/** Rango orientativo de litros del asistente «¿Qué tabla necesito?». */
export interface SurferProfile {
  lo: number;
  hi: number;
  level: string;
  weight: number;
}

interface Stored {
  saved: string[];
  compare: CompareItem[];
  alerts: SavedAlert[];
  profile: SurferProfile | null;
}

export interface Account {
  id: string;
  email: string;
  name: string;
}

interface UserState extends Stored {
  ready: boolean;
  /** Cuentas activas en esta instalación (base de datos real). */
  authEnabled: boolean;
  /** Usuario con sesión, o null (también mientras se comprueba). */
  account: Account | null;
  setAccountName: (name: string) => void;
  signOut: () => Promise<void>;
  toggleSaved: (id: string) => void;
  toggleCompare: (item: CompareItem) => void;
  removeCompare: (id: string) => void;
  clearCompare: () => void;
  /** Sustituye la selección entera (comparación compartida o datos actualizados). */
  replaceCompare: (items: CompareItem[]) => void;
  addAlert: (text: string, query: string) => void;
  toggleAlert: (id: string) => void;
  removeAlert: (id: string) => void;
  setProfile: (profile: SurferProfile | null) => void;
  toast: (text: string) => void;
}

const KEY = "rb-usuario-v1";
const EMPTY: Stored = { saved: [], compare: [], alerts: [], profile: null };

const Ctx = createContext<UserState | null>(null);

function load(): Stored {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const p = JSON.parse(raw) as Partial<Stored>;
    return {
      saved: Array.isArray(p.saved) ? p.saved : [],
      // Ids antiguos, duplicados o manipulados se descartan: el comparador nunca se rompe por esto.
      compare: sanitizeCompare(p.compare),
      alerts: Array.isArray(p.alerts) ? p.alerts : [],
      profile: p.profile ?? null,
    };
  } catch {
    return EMPTY;
  }
}

/**
 * Cliente de Supabase bajo demanda: solo se descarga con cuentas activas (`authEnabled`).
 * En modo demo ninguna ruta de código llega a pedirlo, así que no entra en el bundle de cada página.
 */
const loadSupabase = () => import("@/lib/supabase/browser").then((m) => m.getBrowserSupabase());

/** Guardados de la cuenta como ids públicos («a123»). */
async function loadFavorites(): Promise<string[] | null> {
  const { data, error } = await (await loadSupabase()).from("favorites").select("listing_id").order("created_at", { ascending: false });
  return error ? null : (data ?? []).map((r) => "a" + r.listing_id);
}

export function UserStateProvider({ children, authEnabled = false }: { children: React.ReactNode; authEnabled?: boolean }) {
  const [state, setState] = useState<Stored>(EMPTY);
  const [ready, setReady] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  const [toastText, setToastText] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    // localStorage solo existe en el cliente: se carga tras hidratar para no desajustar el HTML.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(load());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      // Navegación privada o almacenamiento bloqueado: el estado sigue en memoria.
    }
  }, [state, ready]);

  const toast = useCallback((text: string) => {
    setToastText(text);
    clearTimeout(timer.current);
    // Los avisos largos (con instrucciones) se quedan más tiempo en pantalla (WCAG 2.2.1).
    timer.current = setTimeout(() => setToastText(""), text.length > 80 ? 5000 : 2800);
  }, []);

  // Copia del estado para decidir los avisos fuera de los updaters de setState.
  const current = useRef(state);
  useEffect(() => {
    current.current = state;
  }, [state]);

  const accountRef = useRef<Account | null>(null);
  useEffect(() => {
    accountRef.current = account;
  }, [account]);

  // Sesión: el cliente del navegador lee las cookies, refresca el token y avisa de los cambios.
  useEffect(() => {
    if (!authEnabled || !ready) return;
    let cancelled = false;
    let unsubscribe = () => {};
    let syncedFor: string | null = null;
    type Client = Awaited<ReturnType<typeof loadSupabase>>;

    async function signedIn(supabase: Client, user: { id: string; email?: string | null }) {
      if (syncedFor === user.id) return;
      syncedFor = user.id;
      const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
      setAccount({ id: user.id, email: user.email ?? "", name: profile?.display_name ?? "Surfista" });
      // Fusión: los guardados del dispositivo que aún no están en la cuenta se suben una vez.
      const remote = await loadFavorites();
      if (!remote) return;
      const missing = current.current.saved.filter((id) => !remote.includes(id) && listingDbId(id) !== null);
      if (missing.length) {
        await supabase
          .from("favorites")
          .upsert(
            missing.map((id) => ({ listing_id: listingDbId(id)! })),
            { onConflict: "user_id,listing_id", ignoreDuplicates: true },
          );
      }
      setState((s) => ({ ...s, saved: [...new Set([...remote, ...missing])] }));
    }

    // Sin cookie de sesión no se descarga supabase-js: la mayoría de visitas no han entrado nunca.
    // Si alguien entra ahora (código por email o contraseña), LoginForm avisa con SIGNED_IN_EVENT.
    let started = false;
    const start = () => {
      if (started || cancelled) return;
      started = true;
      void loadSupabase().then((supabase) => {
        if (cancelled) return;
        supabase.auth.getUser().then(({ data }) => {
          if (data.user && !cancelled) void signedIn(supabase, data.user);
        });
        const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === "SIGNED_IN" && session?.user) {
            // Fuera del callback: Supabase recomienda no esperar a otras llamadas dentro de él.
            const user = session.user;
            setTimeout(() => void signedIn(supabase, user), 0);
          } else if (event === "SIGNED_OUT") {
            syncedFor = null;
            setAccount(null);
          }
        });
        unsubscribe = () => sub.subscription.unsubscribe();
      });
    };
    if (hasSessionCookie()) start();
    window.addEventListener(SIGNED_IN_EVENT, start);
    return () => {
      cancelled = true;
      window.removeEventListener(SIGNED_IN_EVENT, start);
      unsubscribe();
    };
  }, [authEnabled, ready]);

  const toggleSaved = useCallback(
    (id: string) => {
      const on = current.current.saved.includes(id);
      const acc = accountRef.current;
      const dbId = listingDbId(id);
      setState((s) => ({ ...s, saved: on ? s.saved.filter((x) => x !== id) : [...s.saved, id] }));
      if (!on) track("listing_saved", {});
      if (!acc || dbId === null) {
        if (!on) toast("Guardada en este dispositivo. En Guardadas verás si baja de precio o se vende.");
        return;
      }
      void loadSupabase()
        .then((supabase) => {
          const table = supabase.from("favorites");
          return on
            ? table.delete().eq("listing_id", dbId)
            : table.upsert({ listing_id: dbId }, { onConflict: "user_id,listing_id", ignoreDuplicates: true });
        })
        .then(
          ({ error }) => !error,
          () => false,
        )
        .then((ok) => {
          if (!ok) {
            // Se deshace el cambio optimista.
            setState((s) => ({ ...s, saved: on ? [...s.saved, id] : s.saved.filter((x) => x !== id) }));
            toast("No se ha podido guardar en tu cuenta. Vuelve a intentarlo.");
          } else if (!on) {
            toast("Guardada en tu cuenta.");
          }
        });
    },
    [toast],
  );

  const setAccountName = useCallback((name: string) => {
    setAccount((a) => (a ? { ...a, name } : a));
  }, []);

  const signOut = useCallback(async () => {
    if (!authEnabled) return;
    await (await loadSupabase()).auth.signOut();
    setAccount(null);
    // Los guardados quedan en la cuenta; en un dispositivo compartido no deben seguir a la vista.
    setState((s) => ({ ...s, saved: [] }));
  }, [authEnabled]);

  const toggleCompare = useCallback(
    (item: CompareItem) => {
      const s = current.current;
      if (s.compare.some((c) => c.id === item.id)) {
        setState((p) => ({ ...p, compare: p.compare.filter((c) => c.id !== item.id) }));
      } else if (s.compare.length >= MAX_COMPARE) {
        toast(`Puedes comparar hasta ${MAX_COMPARE} tablas. Quita una para añadir esta.`);
      } else {
        setState((p) => ({ ...p, compare: [...p.compare, item] }));
        track("compare_added", { count: s.compare.length + 1 });
      }
    },
    [toast],
  );

  const removeCompare = useCallback((id: string) => {
    setState((s) => ({ ...s, compare: s.compare.filter((c) => c.id !== id) }));
  }, []);

  const clearCompare = useCallback(() => {
    setState((s) => ({ ...s, compare: [] }));
  }, []);

  const replaceCompare = useCallback((items: CompareItem[]) => {
    setState((s) => ({ ...s, compare: sanitizeCompare(items) }));
  }, []);

  const addAlert = useCallback(
    (text: string, query: string) => {
      // Una alerta por búsqueda: si ya existe la misma `query`, no se duplica.
      if (current.current.alerts.some((a) => a.query === query)) {
        toast("Ya tienes esta búsqueda guardada.");
        return;
      }
      track("alert_created", {});
      setState((s) =>
        s.alerts.some((a) => a.query === query)
          ? s
          : {
              ...s,
              alerts: [{ id: crypto.randomUUID(), text, query, on: true, createdAt: new Date().toISOString() }, ...s.alerts],
            },
      );
      toast("Búsqueda guardada en este dispositivo. No envía avisos: en «Búsquedas» verás cuántas tablas coinciden cuando vuelvas.");
    },
    [toast],
  );

  const toggleAlert = useCallback((id: string) => {
    setState((s) => ({ ...s, alerts: s.alerts.map((a) => (a.id === id ? { ...a, on: !a.on } : a)) }));
  }, []);

  const removeAlert = useCallback((id: string) => {
    setState((s) => ({ ...s, alerts: s.alerts.filter((a) => a.id !== id) }));
  }, []);

  const setProfile = useCallback((profile: SurferProfile | null) => {
    setState((s) => ({ ...s, profile }));
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      ready,
      authEnabled,
      account,
      setAccountName,
      signOut,
      toggleSaved,
      toggleCompare,
      removeCompare,
      clearCompare,
      replaceCompare,
      addAlert,
      toggleAlert,
      removeAlert,
      setProfile,
      toast,
    }),
    [
      state,
      ready,
      authEnabled,
      account,
      setAccountName,
      signOut,
      toggleSaved,
      toggleCompare,
      removeCompare,
      clearCompare,
      replaceCompare,
      addAlert,
      toggleAlert,
      removeAlert,
      setProfile,
      toast,
    ],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className={styles.wrap} aria-live="polite" role="status">
        {toastText && <div className={styles.toast}>{toastText}</div>}
      </div>
    </Ctx.Provider>
  );
}

const noop = () => () => {};

export function useUserState() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useUserState debe usarse dentro de UserStateProvider");
  // Mientras un componente se hidrata ve el estado vacío, igual que el HTML del servidor.
  // Sin esto, los límites de Suspense que hidratan después de cargar localStorage no coinciden.
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  return hydrated ? v : { ...v, ...EMPTY, ready: false, account: null };
}
