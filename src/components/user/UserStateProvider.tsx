"use client";

// Estado del usuario invitado: guardados, comparación, alertas y perfil de surfista.
// Vive SOLO en este dispositivo (localStorage), como en el prototipo. La cuenta en la nube
// y el envío real de alertas (email/push) están pendientes (docs/ROADMAP.md).

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import styles from "./Toast.module.css";

export interface CompareItem {
  id: string;
  label: string;
}

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

interface UserState extends Stored {
  ready: boolean;
  toggleSaved: (id: string) => void;
  toggleCompare: (item: CompareItem) => void;
  removeCompare: (id: string) => void;
  addAlert: (text: string, query: string) => void;
  toggleAlert: (id: string) => void;
  removeAlert: (id: string) => void;
  setProfile: (profile: SurferProfile | null) => void;
  toast: (text: string) => void;
}

const KEY = "rb-usuario-v1";
const EMPTY: Stored = { saved: [], compare: [], alerts: [], profile: null };
export const MAX_COMPARE = 4;

const Ctx = createContext<UserState | null>(null);

function load(): Stored {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const p = JSON.parse(raw) as Partial<Stored>;
    return {
      saved: Array.isArray(p.saved) ? p.saved : [],
      compare: Array.isArray(p.compare) ? p.compare.slice(0, MAX_COMPARE) : [],
      alerts: Array.isArray(p.alerts) ? p.alerts : [],
      profile: p.profile ?? null,
    };
  } catch {
    return EMPTY;
  }
}

export function UserStateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Stored>(EMPTY);
  const [ready, setReady] = useState(false);
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
    timer.current = setTimeout(() => setToastText(""), 2800);
  }, []);

  // Copia del estado para decidir los avisos fuera de los updaters de setState.
  const current = useRef(state);
  useEffect(() => {
    current.current = state;
  }, [state]);

  const toggleSaved = useCallback(
    (id: string) => {
      const on = current.current.saved.includes(id);
      if (!on) toast("Guardada en este dispositivo. Los avisos de bajada de precio aún no están activos.");
      setState((s) => ({ ...s, saved: on ? s.saved.filter((x) => x !== id) : [...s.saved, id] }));
    },
    [toast],
  );

  const toggleCompare = useCallback(
    (item: CompareItem) => {
      const s = current.current;
      if (s.compare.some((c) => c.id === item.id)) {
        setState((p) => ({ ...p, compare: p.compare.filter((c) => c.id !== item.id) }));
      } else if (s.compare.length >= MAX_COMPARE) {
        toast(`Puedes comparar hasta ${MAX_COMPARE} tablas`);
      } else {
        setState((p) => ({ ...p, compare: [...p.compare, item] }));
      }
    },
    [toast],
  );

  const removeCompare = useCallback((id: string) => {
    setState((s) => ({ ...s, compare: s.compare.filter((c) => c.id !== id) }));
  }, []);

  const addAlert = useCallback(
    (text: string, query: string) => {
      setState((s) => ({
        ...s,
        alerts: [{ id: crypto.randomUUID(), text, query, on: true, createdAt: new Date().toISOString() }, ...s.alerts],
      }));
      toast(`Alerta guardada: ${text}. Los avisos por email aún no están activos.`);
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
    () => ({ ...state, ready, toggleSaved, toggleCompare, removeCompare, addAlert, toggleAlert, removeAlert, setProfile, toast }),
    [state, ready, toggleSaved, toggleCompare, removeCompare, addAlert, toggleAlert, removeAlert, setProfile, toast],
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
  return hydrated ? v : { ...v, ...EMPTY, ready: false };
}
