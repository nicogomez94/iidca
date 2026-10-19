import assert from "node:assert/strict";
import test from "node:test";
import ExcelJS from "exceljs";
import { buildImportTemplate, parseImportFile, validateImportRow } from "./profileImport.js";

const csvRow = [
  "club-001", "Club, de Prueba", "CLUB", "PUBLISHED", "Club del barrio", "Entrenamos en equipo",
  "Fútbol | Natación", "Ciudad de Buenos Aires", "Palermo", "Calle 123", "-34.5", "-58.4",
  "hola@club.test", "1112345678", "", "https://club.test", "https://club.test/foto.jpg",
];

test("la plantilla CSV acepta comillas, separadores y deportes múltiples", async () => {
  const template = await buildImportTemplate("csv");
  const csv = Buffer.concat([template, Buffer.from(`${csvRow.map((value) => value.includes(",") ? `"${value}"` : value).join(",")}\n`)]);
  const rows = await parseImportFile(csv, "clubes.csv");
  const profile = validateImportRow(rows[0]);
  assert.equal(profile.errors.length, 0);
  assert.equal(profile.data.name, "Club, de Prueba");
  assert.deepEqual(profile.data.sports, ["Fútbol", "Natación"]);
  assert.equal(profile.data.latitude, -34.5);
});

test("la plantilla XLSX se puede completar y leer", async () => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await buildImportTemplate("xlsx"));
  const sheet = workbook.worksheets[0];
  sheet.addRow(csvRow);
  const rows = await parseImportFile(Buffer.from(await workbook.xlsx.writeBuffer()), "clubes.xlsx");
  assert.equal(rows.length, 1);
  assert.equal(validateImportRow(rows[0]).data.name, "Club, de Prueba");
});

test("rechaza columnas faltantes, coordenadas incompletas y URLs no seguras", async () => {
  await assert.rejects(parseImportFile(Buffer.from("nombre,tipo,ciudad\nClub,CLUB,Buenos Aires\n"), "clubes.csv"), /id_externo/);
  const template = await buildImportTemplate("csv");
  const invalid = [...csvRow];
  invalid[1] = "Club de Prueba";
  invalid[11] = "";
  invalid[16] = "http://club.test/foto.jpg";
  const rows = await parseImportFile(Buffer.concat([template, Buffer.from(`${invalid.join(",")}\n`)]), "clubes.csv");
  const errors = validateImportRow(rows[0]).errors.join(" ");
  assert.match(errors, /latitud y longitud/);
  assert.match(errors, /foto_url/);
});

test("rechaza fórmulas de Excel en las fichas", async () => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await buildImportTemplate("xlsx"));
  workbook.worksheets[0].getCell("B2").value = { formula: "1+1", result: 2 };
  await assert.rejects(parseImportFile(Buffer.from(await workbook.xlsx.writeBuffer()), "clubes.xlsx"), /fórmula/);
});
