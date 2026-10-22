// Siluetas de las 7 formas de tabla vistas desde arriba, a escala relativa (la longitud real manda).
// Ilustración funcional: enseña cómo es cada forma mejor que la palabra. SVG propio y ligero.

import type { Shape } from "@/lib/domain/taxonomy";

interface Spec {
  /** Longitud de referencia en pulgadas (para la escala relativa). */
  len: number;
  /** Anchura máxima en pulgadas. */
  w: number;
  /** Posición del punto ancho (0 = nose, 1 = tail). */
  wide: number;
  /** Redondez de la punta (0 = puntiaguda, 1 = muy redonda). */
  nose: number;
  /** Anchura de la cola en pulgadas. */
  tail: number;
  swallow?: boolean;
}

export const BOARD_SPECS: Record<Shape, Spec> = {
  shortboard: { len: 72, w: 19.5, wide: 0.52, nose: 0.05, tail: 9, },
  fish: { len: 68, w: 21.5, wide: 0.55, nose: 0.45, tail: 13, swallow: true },
  hibrida: { len: 70, w: 20.5, wide: 0.5, nose: 0.3, tail: 11 },
  evolutiva: { len: 86, w: 22, wide: 0.48, nose: 0.75, tail: 12.5 },
  midlength: { len: 88, w: 21, wide: 0.5, nose: 0.35, tail: 10.5 },
  longboard: { len: 110, w: 23, wide: 0.5, nose: 0.95, tail: 14 },
  gun: { len: 90, w: 19.75, wide: 0.42, nose: 0.02, tail: 6 },
};

const MAX_LEN = 110;

/** Contorno simétrico de la tabla en un lienzo de 40 × 120 (escala: 1 pulgada ≈ 1,07 unidades). */
export function boardPath(s: Spec) {
  const k = 112 / MAX_LEN;
  const L = s.len * k;
  const top = (120 - L) / 2;
  const cx = 20;
  // Anchura exagerada un 30 % para que se lean como iconos (las proporciones entre formas se mantienen).
  const hw = (s.w * k * 1.3) / 2;
  const tw = (s.tail * k * 1.3) / 2;
  const yw = top + L * s.wide;
  const bottom = top + L;
  const n = s.nose;
  // Lado izquierdo: punta → punto ancho → cola
  const left = [
    `C ${cx - hw * (0.15 + 0.85 * n)} ${top + L * 0.01 * (1 - n)}, ${cx - hw} ${top + (yw - top) * (0.55 - 0.3 * n)}, ${cx - hw} ${yw}`,
    `C ${cx - hw} ${yw + (bottom - yw) * 0.55}, ${cx - tw - (hw - tw) * 0.35} ${bottom - L * 0.03}, ${cx - tw} ${bottom}`,
  ];
  const tailPath = s.swallow
    ? `L ${cx - tw * 0.25} ${bottom - L * 0.07} L ${cx + tw * 0.25} ${bottom - L * 0.07} L ${cx + tw} ${bottom}`
    : `Q ${cx} ${bottom + L * 0.012} ${cx + tw} ${bottom}`;
  const right = [
    `C ${cx + tw + (hw - tw) * 0.35} ${bottom - L * 0.03}, ${cx + hw} ${yw + (bottom - yw) * 0.55}, ${cx + hw} ${yw}`,
    `C ${cx + hw} ${top + (yw - top) * (0.55 - 0.3 * n)}, ${cx + hw * (0.15 + 0.85 * n)} ${top + L * 0.01 * (1 - n)}, ${cx} ${top}`,
  ];
  return { d: `M ${cx} ${top} ${left.join(" ")} ${tailPath} ${right.join(" ")} Z`, top, bottom };
}

interface Props {
  shape: Shape;
  /** Altura en px del lienzo (la tabla se dibuja a escala dentro). */
  size?: number;
  /** Tono: sobre claro o sobre petróleo. */
  tone?: "light" | "dark" | "soft";
  className?: string;
  title?: string;
}

export function BoardShape({ shape, size = 96, tone = "light", className, title }: Props) {
  const spec = BOARD_SPECS[shape];
  const { d, top, bottom } = boardPath(spec);
  const fill = tone === "dark" ? "#F4F1EA" : tone === "soft" ? "#DDF1F0" : "#FFFFFF";
  const line = tone === "dark" ? "#7AD1CE" : "#087E8B";
  const outline = tone === "dark" ? "#F4F1EA" : "#102D3B";
  return (
    <svg
      width={(size * 40) / 120}
      height={size}
      viewBox="0 0 40 120"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <path d={d} fill={fill} stroke={outline} strokeWidth={1.4} strokeLinejoin="round" />
      <line x1="20" y1={top + 3} x2="20" y2={bottom - 3} stroke={line} strokeWidth={0.9} strokeLinecap="round" />
    </svg>
  );
}
