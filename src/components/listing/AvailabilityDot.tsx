import type { Tone } from "@/lib/listing/present";
import ui from "@/styles/ui.module.css";

const TONE = { success: ui.dotSuccess, warning: ui.dotWarning, error: ui.dotError };

/** Verde = disponible · ámbar = pendiente · rojo = vendida, caducada o retirada. */
export function AvailabilityDot({ tone, size = 7 }: { tone: Tone; size?: number }) {
  return <span className={`${ui.dot} ${TONE[tone]}`} style={{ width: size, height: size }} aria-hidden="true" />;
}
