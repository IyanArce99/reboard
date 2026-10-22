// Servicio de publicación de anuncios.
//
// ⚠️ STUB DE DEMOSTRACIÓN. Reboard aún no tiene base de datos, almacenamiento de fotos
// ni verificación por SMS (docs/ROADMAP.md). `demoPublishService` NO persiste nada,
// NO envía ningún SMS y NO hace que el anuncio aparezca en búsquedas.
// Cuando exista el backend, se implementa esta misma interfaz y se sustituye el stub.

import type { PublishDraft } from "./draft";

export interface PhoneVerification {
  /** true solo si un proveedor real ha verificado el número. */
  verified: boolean;
  /** true cuando no se ha enviado ningún SMS porque es la demo. */
  demo: boolean;
}

export interface PublishResult {
  /** Identificador del anuncio guardado. null si no se ha guardado (demo). */
  id: string | null;
  /** true solo si el anuncio se ha guardado y es visible en búsquedas. */
  persisted: boolean;
  demo: boolean;
}

export interface PublishService {
  readonly isDemo: boolean;
  /** Envía y comprueba el código por SMS. Solo se pide al final, al publicar. */
  verifyPhone(phone: string): Promise<PhoneVerification>;
  /** Publica un anuncio nuevo o guarda los cambios de uno existente (editingId). */
  publish(draft: PublishDraft, opts: { phone: string; editingId: string | null }): Promise<PublishResult>;
}

/** Número de teléfono con un formato mínimamente válido (9–15 dígitos). */
export const isPlausiblePhone = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 9 && digits.length <= 15;
};

/** STUB: no verifica, no guarda, no publica. Ver el aviso al principio del archivo. */
export const demoPublishService: PublishService = {
  isDemo: true,
  async verifyPhone() {
    return { verified: false, demo: true };
  },
  async publish() {
    return { id: null, persisted: false, demo: true };
  },
};

export const getPublishService = (): PublishService => demoPublishService;
