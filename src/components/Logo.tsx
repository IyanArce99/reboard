// Logo Reboard (isotipo «R + tabla», concepto A, + wordmark). Valores de Logo Reboard.dc.html.
// El wordmark es texto en Barlow Condensed 800 hasta tener el SVG en contornos (public/brand/README.md).

import styles from "./Logo.module.css";

export function Logo({ size = 30, tone = "light" }: { size?: number; tone?: "light" | "dark" }) {
  const dark = tone === "dark";
  const c1 = dark ? "#F4F1EA" : "#102D3B";
  const c2 = dark ? "#7AD1CE" : "#087E8B";
  const c3 = dark ? "#102D3B" : "#7AD1CE";
  return (
    <span className={styles.logo} style={{ gap: Math.round(size * 0.22) }}>
      <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
        <path d="M13 3 C18.6 11 18.6 33 16.1 45 L9.9 45 C7.4 33 7.4 11 13 3 Z" fill={c1} />
        <line x1="13" y1="9" x2="13" y2="41.5" stroke={c3} strokeWidth="1.3" strokeLinecap="round" />
        <path d="M19.5 9.5 L27.5 9.5 A8.3 8.3 0 0 1 27.5 26.1 L19.5 26.1" fill="none" stroke={c1} strokeWidth="6" strokeLinejoin="round" />
        <path d="M26.5 27 L35.5 44" fill="none" stroke={c2} strokeWidth="6" strokeLinecap="round" />
      </svg>
      <span className={styles.word} style={{ fontSize: Math.round(size * 0.9) }}>
        <span style={{ color: dark ? "#7AD1CE" : "#087E8B" }}>RE</span>
        <span style={{ color: dark ? "#F4F1EA" : "#102D3B" }}>BOARD</span>
      </span>
    </span>
  );
}
