// Uitlogbericht van Keycloak (Back-Channel Logout): alleen een geldig
// logout_token beëindigt de sessies van die persoon, en alleen die.
import { test } from "node:test";
import assert from "node:assert/strict";
import { exportJWK, generateKeyPair, SignJWT } from "jose";

const ISS = "https://id.test.nl/realms/gemeenten";
process.env.OIDC_ISSUER = ISS;
process.env.OIDC_CLIENT_ID = "oa-integratielaag";
process.env.OA_AUTH = "oidc";

const { publicKey, privateKey } = await generateKeyPair("RS256");
const { privateKey: vreemd } = await generateKeyPair("RS256");
const jwk = { ...(await exportJWK(publicKey)), kid: "k1", alg: "RS256", use: "sig" };
globalThis.fetch = (async (url: string | URL) => {
  const u = String(url);
  const json = (j: unknown) => new Response(JSON.stringify(j), { status: 200, headers: { "content-type": "application/json" } });
  if (u.endsWith("/.well-known/openid-configuration")) return json({ issuer: ISS, jwks_uri: `${ISS}/certs` });
  if (u.endsWith("/certs")) return json({ keys: [jwk] });
  return new Response("", { status: 404 });
}) as typeof fetch;

const { controleerUitlogToken } = await import("../lib/oidc.ts");
const { maakSessie, koppelSessie, leesSessie } = await import("../lib/sessie.ts");
const { POST } = await import("../app/api/auth/uitlogbericht/route.ts");

const EVENT = { "http://schemas.openid.net/event/backchannel-logout": {} };
const teken = (claims: Record<string, unknown>, sleutel = privateKey, aud = "oa-integratielaag") =>
  new SignJWT({ events: EVENT, sid: "s1", ...claims }).setProtectedHeader({ alg: "RS256", kid: "k1", typ: "logout+jwt" }).setIssuer(ISS).setAudience(aud).setIssuedAt().setJti(crypto.randomUUID()).sign(sleutel);
const persoon = (sub: string) => ({ sub, naam: sub, gemeente: "haarlem", gemeenteNaam: "Gemeente Haarlem", rollen: ["medewerker", "ppl-2"], niveau: 2 }) as never;
const verzoek = (token?: string) => {
  const f = new FormData();
  if (token) f.set("logout_token", token);
  return new Request("https://office.test.nl/api/auth/uitlogbericht", { method: "POST", body: f }) as never;
};

test("geldig: alle sessies van die persoon weg, ook gekoppelde; anderen blijven", async () => {
  const a = maakSessie(persoon("femke"));
  const b = koppelSessie(leesSessie(a)!);
  const c = maakSessie(persoon("jeroen"));
  const r = await POST(verzoek(await teken({ sub: "femke" })));
  assert.equal(r.status, 200);
  assert.equal(leesSessie(a), null);
  assert.equal(leesSessie(b), null);
  assert.notEqual(leesSessie(c), null);
});

test("ongeldig: verkeerde sleutel, ontvanger, gebeurtenis, met nonce, zonder sub, zonder token", async () => {
  const c = maakSessie(persoon("jeroen"));
  for (const t of [
    await teken({ sub: "jeroen" }, vreemd),
    await teken({ sub: "jeroen" }, privateKey, "oa-beheer"),
    await teken({ sub: "jeroen", events: { "iets-anders": {} } }),
    await teken({ sub: "jeroen", nonce: "n" }),
    await teken({}),
  ]) {
    await assert.rejects(controleerUitlogToken(t));
    assert.equal((await POST(verzoek(t))).status, 400);
  }
  assert.equal((await POST(verzoek())).status, 400);
  assert.notEqual(leesSessie(c), null);
});
