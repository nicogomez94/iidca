import test from "node:test";
import assert from "node:assert/strict";
import { fieldIsVisible, hasValue, publicRoleFields, requiredMissing } from "./profileFields.js";

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

test("los datos internos no aparecen en los detalles públicos", () => {
  const professional = publicRoleFields("PROFESSIONAL").map((field) => field.name);
  const club = publicRoleFields("CLUB").map((field) => field.name);
  const sponsor = publicRoleFields("SPONSOR").map((field) => field.name);
  assert.equal(professional.includes("workArea"), true);
  assert.equal(club.includes("legalId"), false);
  assert.equal(club.includes("contactPerson"), false);
  assert.equal(sponsor.includes("contributionAmount"), false);
  assert.equal(sponsor.includes("contactName"), false);
  assert.equal(sponsor.includes("corporateEmail"), true);
  assert.equal(sponsor.includes("contactPhone"), true);
});
