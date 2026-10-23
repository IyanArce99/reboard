"use client";

// Publicar desde el navegador (E3): 1) Server Action que valida y guarda el anuncio; 2) subida de
// las fotos nuevas directamente a Storage (la petición no pasa por Vercel, que limita el cuerpo a
// 4,5 MB); 3) Server Action que registra las fotos y publica. Si algo falla, el borrador sigue en
// IndexedDB y se puede reintentar: el paso 1 con el mismo anuncio actualiza en vez de duplicar.

import { finalizeListingAction, saveListingAction } from "@/app/vender/actions";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import type { CatalogModel } from "@/lib/domain/types";
import type { DraftPhoto, PublishDraft } from "./draft";
import { draftToInput } from "./schema";

export type PublishOutcome = { ok: true; path: string; publicId: string } | { ok: false; message: string; login?: boolean; publicId?: string };

export async function publishDraft(opts: {
  draft: PublishDraft;
  catalog: CatalogModel[];
  /** Anuncio ya existente: al editar, o al reintentar tras un fallo de subida. */
  editingId: string | null;
  isNew: boolean;
  turnstileToken: string | null;
  onProgress: (text: string) => void;
}): Promise<PublishOutcome> {
  const { draft, catalog, editingId, isNew, turnstileToken, onProgress } = opts;
  onProgress("Guardando el anuncio…");
  const saved = await saveListingAction({ input: draftToInput(draft, catalog), editingId, turnstileToken });
  if (!saved.ok) return saved;

  const sb = getBrowserSupabase();
  const refs: { path: string; width: number; height: number }[] = [];
  const toUpload = draft.photos.filter((p) => !p.path).length;
  let n = 0;
  for (const p of draft.photos as DraftPhoto[]) {
    if (p.path) {
      refs.push({ path: p.path, width: p.width ?? 1, height: p.height ?? 1 });
      continue;
    }
    if (!p.blob) return { ok: false, message: "Alguna foto no se ha podido preparar. Quítala, vuelve a añadirla y prueba otra vez.", publicId: saved.publicId };
    n += 1;
    onProgress(`Subiendo fotos · ${n} de ${toUpload}`);
    const ext = p.blob.type === "image/jpeg" ? "jpg" : "webp";
    const path = `${saved.userId}/${saved.listingId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await sb.storage
      .from("listing-photos")
      .upload(path, p.blob, { contentType: p.blob.type, cacheControl: "31536000", upsert: false });
    if (error) {
      // Cuota de Storage (migración 20261027090000): 16 archivos por anuncio y 120 subidas al día.
      const quota = /row-level security|unauthorized|403/i.test(error.message);
      return {
        ok: false,
        message: quota
          ? "Has llegado al límite de fotos que se pueden subir por ahora. Espera unas horas y vuelve a intentarlo: no pierdes lo que has rellenado."
          : "No hemos podido subir una de las fotos. Revisa la conexión y vuelve a intentarlo.",
        publicId: saved.publicId,
      };
    }
    // La foto ya está en Storage: si hay que reintentar, no se vuelve a subir.
    p.path = path;
    refs.push({ path, width: p.width ?? 1, height: p.height ?? 1 });
  }

  onProgress(isNew ? "Publicando…" : "Guardando cambios…");
  const done = await finalizeListingAction({ publicId: saved.publicId, photos: refs, publish: isNew });
  if (!done.ok) return { ...done, publicId: saved.publicId };
  return { ok: true, path: done.path, publicId: saved.publicId };
}
