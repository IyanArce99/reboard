"use client";

// Paso 1 · Fotos: añadir (cámara o galería, también arrastrando en escritorio), ordenar y quitar.
// La primera es la portada. El procesado (≤ 1600 px, WebP, sin EXIF ni GPS) lo hace PublishFlow
// con src/lib/publish/image.ts antes de que la foto llegue aquí.

import Image from "next/image";
import { useRef, useState } from "react";
import type { DraftPhoto } from "@/lib/publish/draft";
import { MAX_PHOTOS } from "./parts";
import styles from "./Publish.module.css";

const PHOTO_LABELS = ["cubierta", "fondo", "cola", "nose", "canto", "quillas", "detalle", "funda"];
/** Fotos que recomendamos, en orden. */
const SUGGESTED = ["Cubierta", "Fondo", "Cola y quillas", "Golpes o reparaciones"];

interface Props {
  photos: DraftPhoto[];
  processing: number;
  live: boolean;
  onFiles: (files: FileList | null) => void;
  onRemove: (i: number) => void;
  onMove: (i: number, dir: -1 | 1) => void;
  onLimit: () => void;
}

function CameraIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="13.5" r="3.5" />
    </svg>
  );
}

function GalleryIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="m3 16 5-5 4 4 3-3 6 6" />
      <circle cx="15.5" cy="8.5" r="1.5" />
    </svg>
  );
}

export function StepPhotos({ photos, processing, live, onFiles, onRemove, onMove, onLimit }: Props) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const full = photos.length >= MAX_PHOTOS;
  const empty = photos.length === 0 && processing === 0;

  const open = (ref: React.RefObject<HTMLInputElement | null>) => {
    if (full) {
      onLimit();
      return;
    }
    ref.current?.click();
  };

  const dropProps = {
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(true);
    },
    onDragLeave: () => setDragging(false),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      onFiles(e.dataTransfer.files);
    },
  };

  const buttons = (
    <div className={styles.photoBtns}>
      <button type="button" className={styles.btnPetrol} onClick={() => open(cameraRef)}>
        <CameraIcon />
        Hacer foto
      </button>
      <button type="button" className={styles.btnWhite} onClick={() => open(galleryRef)}>
        <GalleryIcon />
        {empty ? "Elegir de la galería" : "Añadir de la galería"}
      </button>
    </div>
  );

  // Huecos sugeridos que quedan por rellenar (y uno genérico si ya se han cubierto los sugeridos).
  const used = photos.length + processing;
  const slots = used >= MAX_PHOTOS ? [] : used < SUGGESTED.length ? SUGGESTED.slice(used) : ["Otra foto"];

  return (
    <div className={styles.stepBody}>
      {empty ? (
        <div className={styles.drop} data-drag={dragging || undefined} {...dropProps}>
          <span className={styles.dropTitle}>Añade hasta {MAX_PHOTOS} fotos</span>
          <span className={styles.dropText}>
            Cubierta, fondo, cola con las quillas y cualquier golpe o reparación. Con luz natural y la tabla entera.
          </span>
          {buttons}
          <span className={styles.dropHint}>o arrastra aquí las fotos desde tu ordenador</span>
        </div>
      ) : (
        <>
          <ul className={styles.photos} data-drag={dragging || undefined} aria-label="Tus fotos" {...dropProps}>
            {photos.map((p, i) => (
              <li key={p.url} className={styles.photo} data-cover={i === 0 || undefined}>
                <Image
                  src={p.url}
                  alt={i === 0 ? `Foto 1 (portada): ${PHOTO_LABELS[0]}` : `Foto ${i + 1}: ${PHOTO_LABELS[i]}`}
                  fill
                  sizes={i === 0 ? "(max-width: 759px) 66vw, 260px" : "(max-width: 759px) 33vw, 130px"}
                  className={styles.photoImg}
                  unoptimized={p.local}
                />
                <span className={styles.photoBadge} data-cover={i === 0 || undefined}>
                  {i === 0 ? "Portada" : i + 1}
                </span>
                <button type="button" aria-label={`Quitar la foto ${i + 1}`} className={styles.photoRm} onClick={() => onRemove(i)}>
                  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                    <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
                {photos.length > 1 && (
                  <span className={styles.photoMove}>
                    <button
                      type="button"
                      aria-label={i === 1 ? "Usar la foto 2 como portada" : `Mover la foto ${i + 1} antes`}
                      disabled={i === 0}
                      onClick={() => onMove(i, -1)}
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      aria-label={`Mover la foto ${i + 1} después`}
                      disabled={i === photos.length - 1}
                      onClick={() => onMove(i, 1)}
                    >
                      ›
                    </button>
                  </span>
                )}
              </li>
            ))}
            {Array.from({ length: processing }, (_, i) => (
              <li key={`p${i}`} className={styles.slot} aria-hidden="true">
                Preparando…
              </li>
            ))}
            {slots.map((l) => (
              <li key={l} className={styles.slotItem}>
                <button type="button" className={styles.slot} onClick={() => open(galleryRef)} aria-label={`Añadir foto: ${l}`}>
                  <span className={styles.slotPlus} aria-hidden="true">
                    +
                  </span>
                  {l}
                </button>
              </li>
            ))}
          </ul>
          {photos.length > 1 && <p className={styles.small}>Usa las flechas para ordenarlas: la primera es la portada.</p>}
          {buttons}
        </>
      )}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        data-testid="foto-camara"
        onChange={(e) => {
          onFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        data-testid="foto-galeria"
        onChange={(e) => {
          onFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <p className={styles.note} role="status">
        <strong>
          {processing > 0 ? `Preparando ${processing === 1 ? "1 foto" : `${processing} fotos`}… · ` : ""}
          {photos.length} de {MAX_PHOTOS} fotos.
        </strong>{" "}
        {live
          ? "Las reducimos en tu dispositivo y les quitamos la ubicación y los datos de la cámara antes de subirlas."
          : "Demo: las fotos se preparan en tu dispositivo y no se suben a ningún sitio."}
      </p>
    </div>
  );
}
