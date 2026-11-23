// Van token naar identiteit: de gemeente uit Keycloak Organizations.
import { test } from "node:test";
import assert from "node:assert/strict";
import { InlogFout, naarIdentiteit } from "../lib/oidc.ts";

const basis = { sub: "u1", name: "Femke de Vries", realm_access: { roles: ["medewerker", "ppl-2", "offline_access"] } };

test("één gemeente uit de organisaties, met naam", () => {
  const w = naarIdentiteit({ ...basis, organization: { haarlem: { naam: ["Gemeente Haarlem"] } } });
  assert.equal(w.gemeente, "haarlem");
  assert.equal(w.gemeenteNaam, "Gemeente Haarlem");
  assert.deepEqual(w.rollen, ["medewerker", "ppl-2"]);
  assert.equal(w.niveau, 2);
});

test("GR: lid van meer gemeenten, de thuisgemeente uit het attribuut", () => {
  const w = naarIdentiteit({ ...basis, gemeente: "zandvoort", organization: { haarlem: { naam: ["Gemeente Haarlem"] }, zandvoort: { naam: ["Gemeente Zandvoort"] } } });
  assert.equal(w.gemeente, "zandvoort");
  assert.deepEqual(w.gemeenten?.map((g) => g.id), ["haarlem", "zandvoort"]);
});

test("zonder gemeente geen identiteit, met een eigen soort fout", () => {
  assert.throws(() => naarIdentiteit(basis), (e) => e instanceof InlogFout && e.soort === "geen-gemeente");
  assert.throws(
    () => naarIdentiteit({ ...basis, organization: { haarlem: {}, zandvoort: {} } }),
    (e) => e instanceof InlogFout && e.soort === "geen-gemeente",
  );
});

test("een inrichting van vóór de organisaties: de claim gemeente", () => {
  assert.equal(naarIdentiteit({ ...basis, gemeente: "haarlem" }).gemeente, "haarlem");
});
