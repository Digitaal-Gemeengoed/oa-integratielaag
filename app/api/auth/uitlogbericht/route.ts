import { NextResponse, type NextRequest } from "next/server";
import { config } from "../../../../lib/config";
import { controleerUitlogToken } from "../../../../lib/oidc";
import { beeindigVoorPersoon } from "../../../../lib/sessie";

export const dynamic = "force-dynamic";

/**
 * Uitlogbericht van Keycloak (OpenID Connect Back-Channel Logout). Keycloak
 * stuurt dit als iemands sessies daar eindigen: uitloggen elders, of het
 * beheerportaal dat een medewerker uitschakelt of zijn niveau wijzigt. Dan
 * eindigen hier ook al zijn sessies, zodat het oude niveau niet blijft hangen.
 */
export async function POST(req: NextRequest) {
  const geen = { "cache-control": "no-store" };
  if (config.authModus() !== "oidc") return NextResponse.json({ error: "invalid_request" }, { status: 400, headers: geen });
  const token = (await req.formData().catch(() => null))?.get("logout_token");
  if (typeof token !== "string" || !token) return NextResponse.json({ error: "invalid_request" }, { status: 400, headers: geen });
  try {
    const sub = await controleerUitlogToken(token);
    const n = beeindigVoorPersoon(sub);
    console.log(`[uitlogbericht] ${n} sessie(s) beëindigd`);
    return new NextResponse(null, { status: 200, headers: geen });
  } catch (e) {
    console.warn(`[uitlogbericht] geweigerd: ${(e as Error).message}`);
    return NextResponse.json({ error: "invalid_request" }, { status: 400, headers: geen });
  }
}
