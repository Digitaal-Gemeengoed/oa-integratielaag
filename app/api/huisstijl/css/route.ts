import { huisstijlCss } from "../../../../lib/huisstijl";

export const dynamic = "force-dynamic";

/** De CSS van de huisstijl (design tokens van NL Design System). */
export async function GET() {
  const css = await huisstijlCss();
  if (css === null) return new Response("Geen huisstijl ingesteld", { status: 404 });
  return new Response(css, { headers: { "content-type": "text/css; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
