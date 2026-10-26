import test from "node:test";
import assert from "node:assert/strict";
import { fieldIsVisible, hasValue, requiredMissing } from "./profileFields.js";

test("la edad del deportista es opcional y los arreglos cuentan para la completitud", () => {
  const details = {
    country: "Argentina",
    searchGoals: ["Encontrar un club o gimnasio"],
    favoriteSports: ["Fútbol"],
    level: "Principiante",
    frequency: "1 vez por semana",
    teamContact: "Sí",
    availability: ["Tarde"],
    tournamentInterest: "No",
    objective: "Recreación",
    receiveOffers: "No",
  };
  assert.deepEqual(requiredMissing("ATHLETE", details), []);
  assert.equal(hasValue(5), true);
  assert.equal(hasValue([]), false);
});

test("los campos condicionales aparecen únicamente al elegir Sí", () => {
  const legalField = { when: { name: "hasLegalStatus", value: "Sí" } };
  assert.equal(fieldIsVisible(legalField, { hasLegalStatus: "Sí" }), true);
  assert.equal(fieldIsVisible(legalField, { hasLegalStatus: "No" }), false);
});

test("la cláusula del sponsor es obligatoria", () => {
  const missing = requiredMissing("SPONSOR", {
    legalId: "30-12345678-9", sector: "Indumentaria", country: "Argentina",
    support: ["Club deportivo"], supportType: ["Sponsoreo publicitario"],
    contributionAmount: 100000, contributionCurrency: "ARS", contributionMode: "Único",
    visibilityGoals: ["Impacto social"], contactName: "Ana", contactRole: "Alianzas",
    corporateEmail: "ana@example.com", contactPhone: "+5491100000000",
    sponsorTermsAccepted: false,
  });
  assert.equal(missing.some((field) => field.name === "sponsorTermsAccepted"), true);
});
