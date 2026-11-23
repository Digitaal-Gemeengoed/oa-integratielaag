import type { NextRequest } from "next/server";
import type { WieBenIk } from "@digitaalgemeengoed/oa-contract";
import { config } from "./config";
import { naarActor } from "./identiteit";

const MAX_BODY = 30 * 1024 * 1024;

async function body(req: NextRequest): Promise<string | undefined> {
  if (req.method === "GET" || req.method === "HEAD") return undefined;
  const lengte = Number(req.headers.get("content-length") ?? 0);
  if (lengte > MAX_BODY) throw new Error("verzoek te groot");
  return await req.text();
}

function kopregels(w: WieBenIk, sleutel: string): Record<string, string> {
  return {
    "content-type": "application/json",
    "x-oa-dienstsleutel": sleutel,
    "x-oa-gemeente": w.gemeente,
    "x-oa-actor": Buffer.from(JSON.stringify(naarActor(w))).toString("base64url"),
  };
}

function doorsturen(r: Response): Response {
  const h = new Headers();
  for (const k of ["content-type", "x-oa-formaat"]) {
    const v = r.headers.get(k);
    if (v) h.set(k, v);
  }
  h.set("cache-control", "no-store");
  // Inhoud van documenten komt van medewerkers en kan scripts bevatten. Op
  // ons eigen adres uitgeleverd zou dat de sessie in gevaar brengen; de
  // sandbox geeft de pagina een eigen, lege herkomst zonder scripts.
  const soort = r.headers.get("content-type") ?? "";
  if (!soort.startsWith("application/json")) {
    h.set("content-security-policy", "sandbox; default-src 'none'; img-src data:; style-src 'unsafe-inline'");
    h.set("x-content-type-options", "nosniff");
  }
  return new Response(r.body, { status: r.status, headers: h });
}

/** Naar de Object Service van het platform. */
export async function naarPlatform(req: NextRequest, w: WieBenIk, pad: string, methode = req.method): Promise<Response> {
  const r = await fetch(`${config.platformUrl()}${pad}`, {
    method: methode,
    headers: kopregels(w, config.platformSleutel()),
    body: await body(req),
  });
  return doorsturen(r);
}

/** Naar de assistent-services (lezende ingang). */
export async function naarDiensten(req: NextRequest, w: WieBenIk, pad: string): Promise<Response> {
  const r = await fetch(`${config.dienstenUrl()}${pad}`, {
    method: "POST",
    headers: kopregels(w, config.dienstenSleutel()),
    body: await body(req),
  });
  return doorsturen(r);
}

const aangemeld = new Map<string, string>();

/**
 * Na het inloggen: de thuisgemeente aanmelden bij het platform. Is ze nieuw
 * (net in Keycloak aangesloten), dan zet het platform haar klaar; anders werkt
 * het alleen de naam bij. Eén keer per gemeente en naam per proces. Een fout
 * houdt het inloggen niet tegen: het platform meldt het dan zelf bij het eerste verzoek.
 */
export async function meldGemeenteAan(w: WieBenIk): Promise<void> {
  const naam = w.gemeenteNaam ?? w.gemeente;
  if (aangemeld.get(w.gemeente) === naam) return;
  try {
    const r = await fetch(`${config.platformUrl()}/gemeente`, {
      method: "PUT",
      headers: kopregels(w, config.platformSleutel()),
      body: JSON.stringify({ naam }),
    });
    if (r.ok) aangemeld.set(w.gemeente, naam);
    else console.warn("gemeente aanmelden bij het platform:", r.status, await r.text().catch(() => ""));
  } catch (e) {
    console.warn("gemeente aanmelden bij het platform:", (e as Error).message);
  }
}
