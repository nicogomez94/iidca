import ExcelJS from "exceljs";

export const importColumns = [
  ["id_externo", "Identificador estable y único. Obligatorio."],
  ["nombre", "Nombre público. Obligatorio."],
  ["tipo", "CLUB, PROFESSIONAL, FEDERATION o SPONSOR. Obligatorio."],
  ["estado", "PUBLISHED, PENDING o HIDDEN. Si se omite: PUBLISHED."],
  ["titulo", "Frase breve de presentación."],
  ["descripcion", "Descripción pública, hasta 1200 caracteres."],
  ["deportes", "Separar varias actividades con |. Ejemplo: Fútbol | Natación."],
  ["ciudad", "Ciudad. Obligatoria."],
  ["barrio", "Barrio o localidad."],
  ["direccion", "Dirección de la sede."],
  ["latitud", "Coordenada decimal; completar junto con longitud para figurar en el mapa."],
  ["longitud", "Coordenada decimal; completar junto con latitud para figurar en el mapa."],
  ["email", "Email público de contacto; no crea una cuenta."],
  ["telefono", "Teléfono público de contacto."],
  ["instagram", "Usuario o URL de Instagram."],
  ["sitio_web", "URL del sitio web."],
  ["foto_url", "URL HTTPS de la foto correspondiente al perfil."],
  ["niveles", "CLUB: niveles ofrecidos."],
  ["horarios", "CLUB: días y horarios."],
  ["instalaciones", "CLUB: infraestructura."],
  ["edades", "CLUB: edades admitidas."],
  ["profesion", "PROFESSIONAL: profesión principal."],
  ["matricula", "PROFESSIONAL: matrícula, si aplica."],
  ["modalidad", "PROFESSIONAL: Presencial, Online o Ambos."],
  ["especialidad", "PROFESSIONAL: especialidad."],
  ["formacion", "PROFESSIONAL: formación principal."],
  ["experiencia", "PROFESSIONAL: años de experiencia."],
  ["region", "FEDERATION: región."],
  ["fundacion", "FEDERATION: año de fundación."],
  ["identificacion_legal", "FEDERATION o SPONSOR: CUIT o registro legal."],
  ["practica_social", "FEDERATION: Sí o No."],
  ["principiantes", "FEDERATION: Sí o No."],
  ["sector", "SPONSOR: rubro."],
  ["apoyo", "SPONSOR: proyecto que quiere acompañar."],
  ["tipo_apoyo", "SPONSOR: tipo de aporte."],
];

const headers = importColumns.map(([name]) => name);
const roles = new Set(["CLUB", "PROFESSIONAL", "FEDERATION", "SPONSOR"]);
const statuses = new Set(["PUBLISHED", "PENDING", "HIDDEN"]);
const roleDetails = {
  CLUB: { niveles: "levels", horarios: "schedule", instalaciones: "facilities", edades: "ages" },
  PROFESSIONAL: { profesion: "profession", matricula: "license", modalidad: "mode", especialidad: "specialty", formacion: "education", experiencia: "experience" },
  FEDERATION: { region: "region", fundacion: "founded", identificacion_legal: "legalId", practica_social: "socialPractice", principiantes: "beginners" },
  SPONSOR: { sector: "sector", identificacion_legal: "legalId", apoyo: "support", tipo_apoyo: "supportType" },
};

export function importError(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function normalizeHeader(value) {
  return String(value || "").replace(/^\uFEFF/, "").trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function detectDelimiter(firstLine) {
  const counts = [",", ";", "\t"].map((delimiter) => [delimiter, firstLine.split(delimiter).length - 1]);
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0][1] ? counts[0][0] : ",";
}

export function parseCsv(text) {
  const delimiter = detectDelimiter(String(text).split(/\r?\n/, 1)[0]);
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i += 1; }
      else quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      row.push(cell); cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      row.push(cell); cell = "";
      rows.push(row); row = [];
    } else cell += char;
  }
  if (quoted) throw importError("El CSV tiene comillas sin cerrar.");
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

export async function parseImportFile(buffer, filename) {
  if (!Buffer.isBuffer(buffer) || !buffer.length) throw importError("Elegí un archivo CSV o XLSX.");
  if (buffer.length > 5 * 1024 * 1024) throw importError("El archivo no puede superar 5 MB.");
  const extension = String(filename || "").toLowerCase().split(".").pop();
  let cells;
  if (extension === "csv") {
    cells = parseCsv(buffer.toString("utf8"));
  } else if (extension === "xlsx") {
    const workbook = new ExcelJS.Workbook();
    try { await workbook.xlsx.load(buffer); }
    catch { throw importError("No pudimos leer el Excel. Usá un archivo .xlsx válido."); }
    const sheet = workbook.worksheets[0];
    if (!sheet) throw importError("El Excel no tiene hojas.");
    if (sheet.columnCount > headers.length + 10 || sheet.rowCount > 502)
      throw importError("El Excel supera el tamaño admitido. Usá la plantilla y hasta 500 perfiles.");
    cells = [];
    sheet.eachRow({ includeEmpty: true }, (row) => {
      cells.push(Array.from({ length: Math.max(sheet.columnCount, headers.length) }, (_, index) => {
        const value = row.getCell(index + 1).value;
        if (value && typeof value === "object" && (value.formula || value.sharedFormula))
          throw importError(`La fila ${row.number} contiene una fórmula. Pegá valores antes de importar.`);
        return typeof value === "object" && value !== null ? (value.text ?? "") : (value ?? "");
      }));
    });
  } else throw importError("Formato no admitido. Subí un .csv o .xlsx.");
  if (!cells.length) throw importError("El archivo está vacío.");
  const columns = cells[0].map(normalizeHeader);
  for (const required of ["id_externo", "nombre", "tipo", "ciudad"])
    if (!columns.includes(required)) throw importError(`Falta la columna obligatoria ${required}. Descargá la plantilla.`);
  if (new Set(columns.filter(Boolean)).size !== columns.filter(Boolean).length)
    throw importError("Hay columnas repetidas en la cabecera.");
  const unknown = columns.filter((column) => column && !headers.includes(column));
  if (unknown.length) throw importError(`Columnas no reconocidas: ${unknown.slice(0, 5).join(", ")}.`);
  const extraColumns = cells.slice(1).find((values) => values.slice(columns.length).some((value) => String(value ?? "").trim()));
  if (extraColumns) throw importError("Una fila tiene más valores que columnas. Revisá separadores y comillas del archivo.");
  const rows = cells.slice(1).map((values, index) => ({
    line: index + 2,
    values: Object.fromEntries(columns.map((column, columnIndex) => [column, String(values[columnIndex] ?? "").trim()])),
  })).filter(({ values }) => Object.values(values).some(Boolean));
  if (!rows.length) throw importError("El archivo no tiene perfiles para importar.");
  if (rows.length > 500) throw importError("Podés importar hasta 500 perfiles por archivo.");
  return rows;
}

export function validateImportRow(row) {
  const v = row.values;
  const errors = [];
  const text = (key, max = 200) => {
    const value = v[key] || "";
    if (value.length > max) errors.push(`${key} supera ${max} caracteres`);
    return value || null;
  };
  const id = text("id_externo", 120);
  const name = text("nombre");
  const category = text("tipo", 30)?.toUpperCase();
  const city = text("ciudad");
  const status = (text("estado", 20) || "PUBLISHED").toUpperCase();
  if (!id || !/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(id)) errors.push("id_externo debe tener letras, números, punto, guion o guion bajo");
  if (!name) errors.push("falta nombre");
  if (!roles.has(category)) errors.push("tipo debe ser CLUB, PROFESSIONAL, FEDERATION o SPONSOR");
  if (!city) errors.push("falta ciudad");
  if (!statuses.has(status)) errors.push("estado debe ser PUBLISHED, PENDING o HIDDEN");
  const sports = (text("deportes", 600) || "").split(/[|;,]/).map((value) => value.trim()).filter(Boolean);
  if (sports.length > 10 || sports.some((sport) => sport.length > 60)) errors.push("deportes admite hasta 10 actividades de 60 caracteres");
  const latText = text("latitud", 30);
  const lngText = text("longitud", 30);
  if (Boolean(latText) !== Boolean(lngText)) errors.push("latitud y longitud deben completarse juntas");
  const latitude = latText === null ? null : Number(latText.replace(",", "."));
  const longitude = lngText === null ? null : Number(lngText.replace(",", "."));
  if (latitude !== null && (!Number.isFinite(latitude) || Math.abs(latitude) > 90)) errors.push("latitud inválida");
  if (longitude !== null && (!Number.isFinite(longitude) || Math.abs(longitude) > 180)) errors.push("longitud inválida");
  const email = text("email");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("email inválido");
  const website = text("sitio_web", 500);
  const imageUrl = text("foto_url", 500);
  for (const [label, url] of [["sitio_web", website], ["foto_url", imageUrl]])
    if (url && !/^https:\/\/[^\s]+$/i.test(url)) errors.push(`${label} debe empezar con https://`);
  const details = {};
  for (const [column, key] of Object.entries(roleDetails[category] || {})) {
    const value = text(column, 500);
    if (value) details[key] = value;
  }
  const data = {
    sourceKey: `admin-import:${id}`, sourceName: "Importación administrativa",
    name, category, status,
    headline: text("titulo"), description: text("descripcion", 1200),
    sport: sports[0] || null, sports, city,
    neighborhood: text("barrio"), address: text("direccion"), latitude, longitude,
    email, phone: text("telefono"), instagram: text("instagram"), website,
    imageUrl, details, verification: "UNVERIFIED", isDemo: false,
  };
  return { line: row.line, id, name, category, data, errors };
}

export async function buildImportTemplate(format) {
  if (format === "csv") return Buffer.from(`\uFEFF${headers.join(",")}\r\n`, "utf8");
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Perfiles");
  sheet.columns = importColumns.map(([name]) => ({ header: name, key: name, width: Math.min(28, Math.max(15, name.length + 3)) }));
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF090C70" } };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = { from: "A1", to: `${sheet.getColumn(headers.length).letter}1` };
  sheet.addRow({});
  const guide = workbook.addWorksheet("Guía y ejemplo");
  guide.columns = [{ header: "Columna", width: 25 }, { header: "Cómo completarla", width: 85 }];
  importColumns.forEach(([name, description]) => guide.addRow([name, description]));
  guide.addRow([]);
  guide.addRow(["Ejemplo", "Copiá estos valores en la primera hoja; no importes esta hoja."]);
  guide.addRow(["id_externo", "club-ejemplo-001"]);
  guide.addRow(["nombre", "Club Ejemplo"]);
  guide.addRow(["tipo", "CLUB"]);
  guide.addRow(["ciudad", "Ciudad de Buenos Aires"]);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
