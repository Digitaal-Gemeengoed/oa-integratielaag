import { NextResponse } from "next/server";
import { heeftHuisstijlCss, huisstijlKlasse } from "../../../lib/huisstijl";

export const dynamic = "force-dynamic";

/** Huisstijl van deze inrichting, voor het paneel vóór het inloggen. Openbaar: er staat niets geheims in. */
export async function GET() {
  return NextResponse.json(
    { klasse: huisstijlKlasse(), css: (await heeftHuisstijlCss()) ? "/api/huisstijl/css" : null },
    { headers: { "cache-control": "public, max-age=300" } },
  );
}
