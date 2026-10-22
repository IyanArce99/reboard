import "server-only";
import { getRepository } from "@/lib/data";

/**
 * robots de una página noindex. Sobrescribe el del layout, así que con datos DEMO
 * tiene que repetir el nofollow para que nada del sitio demo se rastree.
 */
export const noindexRobots = () => ({ index: false, follow: !getRepository().isDemo });
