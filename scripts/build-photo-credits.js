import { readFile, writeFile } from "node:fs/promises";

const credits = JSON.parse(await readFile(new URL("../data/image-credits.json", import.meta.url)));
const escape = (value) => String(value || "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[character]);
const items = Object.values(credits).map((credit) => `
  <article>
    <img src="${escape(credit.path)}" alt="${escape(credit.title)}" loading="lazy" />
    <div>
      <h2>${escape(credit.title.replace(/^File:/, ""))}</h2>
      <p>Autoría: ${escape(credit.author || "Wikimedia Commons")}</p>
      <p>Licencia: <a href="${escape(credit.licenseUrl || credit.source)}" target="_blank" rel="noopener noreferrer">${escape(credit.license)}</a></p>
      <a href="${escape(credit.source)}" target="_blank" rel="noopener noreferrer">Ver archivo original y atribución completa ↗</a>
    </div>
  </article>`).join("");
const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Créditos de fotografía · IIDCA Social Club</title>
  <style>
    body { margin: 0; background: #faf9f6; color: #141a46; font: 15px/1.5 Arial, sans-serif; }
    header { padding: 25px; background: #090c70; color: #fff; }
    header div, main { width: min(980px, calc(100% - 36px)); margin: auto; }
    h1 { font-size: 30px; }
    a { color: inherit; }
    main { padding: 32px 0 60px; }
    article { display: grid; grid-template-columns: 150px 1fr; gap: 20px; padding: 18px 0; border-bottom: 1px solid #dce0eb; }
    article img { width: 150px; height: 100px; object-fit: cover; }
    article h2 { margin: 0 0 5px; font-size: 17px; }
    article p { margin: 2px 0; }
    @media (max-width: 600px) { article { grid-template-columns: 1fr; } article img { width: 100%; height: 190px; } }
  </style>
</head>
<body>
  <header><div><a href="/">← IIDCA Social Club</a><h1>Créditos de fotografía</h1></div></header>
  <main><p>Las imágenes de clubes identifican sedes reales cuando así se indica. Las imágenes deportivas restantes son ilustrativas. Agradecemos a sus autores y a Wikimedia Commons por compartirlas con licencias abiertas.</p>${items}</main>
</body>
</html>`;
await writeFile(new URL("../public/creditos-fotos.html", import.meta.url), html);
