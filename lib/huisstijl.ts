import { readFile, stat } from "node:fs/promises";

/**
 * Huisstijl van deze inrichting (OA_HUISSTIJL in oa-uitrol): de klasse waaronder
 * de design tokens staan, en de CSS die bijwerken.sh van npm heeft gehaald.
 * Het paneel gebruikt die zolang het niet weet bij welke gemeente je hoort;
 * daarna gaat het thema van de gemeente voor.
 */
const KLASSE = /^[a-z][a-z0-9-]{1,60}$/;

export const huisstijlKlasse = (): string => {
  const k = process.env.OA_HUISSTIJL_KLASSE ?? "";
  return KLASSE.test(k) ? k : "voorbeeld-theme";
};

const cssPad = () => process.env.OA_HUISSTIJL_CSS ?? "";

export async function heeftHuisstijlCss(): Promise<boolean> {
  const p = cssPad();
  if (!p) return false;
  try {
    return (await stat(/*turbopackIgnore: true*/ p)).isFile();
  } catch {
    return false;
  }
}

export async function huisstijlCss(): Promise<string | null> {
  const p = cssPad();
  if (!p) return null;
  try {
    return await readFile(/*turbopackIgnore: true*/ p, "utf8");
  } catch {
    return null;
  }
}
