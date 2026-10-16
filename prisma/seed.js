import "dotenv/config";
import crypto from "node:crypto";
import { readFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const sourceUrl = "https://data.buenosaires.gob.ar/es_AR/dataset/clubes";
const liveUrl = "https://cdn.buenosaires.gob.ar/datosabiertos/datasets/vicejefatura-de-gobierno/clubes/clubes.geojson";
const credits = JSON.parse(await readFile(new URL("../data/image-credits.json", import.meta.url)));

function stableKey(name, address) {
  return `caba-clubes-${crypto.createHash("sha1").update(`${name}|${address}`.toLocaleLowerCase("es")).digest("hex").slice(0, 12)}`;
}

async function records() {
  if (!process.argv.includes("--live"))
    return JSON.parse(await readFile(new URL("../data/clubes-caba.json", import.meta.url)));
  const response = await fetch(liveUrl, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`No se pudo descargar el padrón oficial (${response.status}).`);
  const data = await response.json();
  return data.features.map(({ properties: p, geometry: g }) => ({
    key: stableKey(p.nombre, p.direccion),
    name: p.nombre, type: p.tipo, siteType: p.tipo_sede,
    activities: p.actividade, address: p.direccion,
    neighborhood: p.barrio, phone: p.telefono, email: p.email,
    website: p.web, facilities: p.instalacio,
    longitude: g?.coordinates?.[0], latitude: g?.coordinates?.[1],
  }));
}

function imageFor(record) {
  const name = record.name.toLocaleLowerCase("es");
  const specific = [
    ["estadio alberto", "boca"],
    ["estadio monumental", "river"],
    ["estadio pedro bidegain", "san-lorenzo"],
    ["estadio josé amalfitani", "velez"],
    ["estadio tomás adolfo ducó", "huracan"],
    ["estadio diego armando maradona", "argentinos"],
    ["estadio islas malvinas", "all-boys"],
    ["estadio arquitecto ricardo etcheverri", "ferro"],
    ["geba) sede san martin", "geba"],
  ].find(([pattern]) => name.includes(pattern));
  if (specific) return { ...credits[specific[1]], illustrative: false };
  const activities = `${record.activities || ""} ${record.name}`.toLocaleLowerCase("es");
  const sport = /básquet|basket/.test(activities) ? "basketball"
    : /vóley|voley|volley/.test(activities) ? "volleyball"
      : /natación|natatorio|aquagym/.test(activities) ? "swimming"
        : /boxeo|boxing/.test(activities) ? "boxing"
          : /tenis|pádel/.test(activities) ? "tennis"
            : /gimnasia|acrobacia/.test(activities) ? "gymnastics"
              : /atletismo|running/.test(activities) ? "running" : "football";
  return { ...credits[sport], illustrative: true };
}

function cleanWebsite(value) {
  if (!value || !/^((https?:\/\/)?[a-z\d][\w.-]+\.[a-z]{2,})/i.test(value.trim())) return null;
  return value.trim().replace(/^http:\/\//i, "https://");
}

const oldExamples = [
  "club-horizonte@example.test", "club-del-parque@example.test",
  "movimiento-sur@example.test", "red-natacion@example.test",
  "espacio-norte@example.test", "alianza-deportiva@example.test",
];
const oldExampleNames = [
  "Club Horizonte", "Club del Parque", "Movimiento Sur",
  "Red Acuática Metropolitana", "Espacio Norte", "Alianza Deportiva",
];

try {
  const starterNews = [
    {
      slug: "empezar-a-entrenar-en-compania",
      title: "Una clase puede ser el comienzo de un gran grupo",
      excerpt: "Moverse con otras personas cambia la energía de cada entrenamiento.",
      body: "Elegir una actividad cerca de casa puede ser el primer paso. No hace falta llegar sabiendo todo: en muchos espacios hay propuestas para empezar de a poco y aprender con otras personas.\n\nCuando entrenar se vuelve un encuentro, también aparecen nuevas razones para volver. Explorá el directorio, conocé las opciones de tu barrio y preguntá por una clase de prueba.",
      category: "ENTRENAR EN COMPAÑÍA",
      imageUrl: "/images/editorial/fitness-class.jpg",
      imageAlt: "Personas ejercitándose juntas en una clase de gimnasio",
    },
    {
      slug: "el-barrio-tambien-se-mueve",
      title: "El barrio también puede ser tu lugar para moverte",
      excerpt: "Una plaza, una actividad y la excusa perfecta para encontrarse.",
      body: "Hay actividades que empiezan a pocas cuadras de casa. Una caminata, un entrenamiento al aire libre o una propuesta de un club pueden ayudarte a descubrir una rutina que se adapte a vos.\n\nBuscá por zona en IIDCA Social Club y compará las opciones disponibles. El mejor lugar para empezar suele ser uno al que te resulte fácil volver.",
      category: "AIRE LIBRE",
      imageUrl: "/images/editorial/park-exercise.jpg",
      imageAlt: "Grupo de personas haciendo actividad física al aire libre",
    },
    {
      slug: "yoga-para-compartir",
      title: "Empezar yoga se disfruta más cuando no estás solo",
      excerpt: "Hay espacios cercanos para probar, aprender y volver a elegirte.",
      body: "Una clase de yoga puede ser un momento para bajar el ritmo y conectar con el cuerpo. Cada espacio tiene su forma de enseñar, así que vale la pena preguntar por niveles, horarios y modalidades.\n\nEn el directorio podés encontrar clubes y profesionales que ofrecen actividades de bienestar. Elegí una propuesta que te quede cómoda y animate a probar.",
      category: "BIENESTAR",
      imageUrl: "/images/editorial/yoga-class.jpg",
      imageAlt: "Personas practicando yoga en una clase grupal",
    },
  ];
  for (const article of starterNews) {
    await prisma.newsArticle.upsert({
      where: { slug: article.slug },
      update: {},
      create: { ...article, published: true, publishedAt: new Date() },
    });
  }
  if (process.env.DEMO_MODE === "true") {
    const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 12);
    await prisma.user.upsert({
      where: { email: "admin@iidca.test" },
      update: {},
      create: { email: "admin@iidca.test", passwordHash, role: "ADMIN" },
    });
    await prisma.user.upsert({
      where: { email: "admin@iidca.com.ar" },
      update: {},
      create: { email: "admin@iidca.com.ar", passwordHash, role: "ADMIN" },
    });
    await prisma.user.upsert({
      where: { email: "test@iidca.test" },
      update: {},
      create: {
        email: "test@iidca.test", passwordHash, role: "ATHLETE",
        profile: { create: { name: "Alex Demo", category: "ATHLETE", city: "Ciudad de Buenos Aires", sports: ["Fútbol"], status: "HIDDEN", isDemo: true } },
      },
    });
  }
  const removedProfiles = await prisma.profile.deleteMany({ where: { isDemo: true, name: { in: oldExampleNames } } });
  const oldUsers = await prisma.user.findMany({
    where: { email: { in: oldExamples } },
    select: { id: true },
  });
  if (oldUsers.length)
    await prisma.user.deleteMany({ where: { id: { in: oldUsers.map((user) => user.id) } } });

  const clubs = await records();
  let created = 0;
  let updated = 0;
  for (const record of clubs) {
    if (!record.name || !record.address || !Number.isFinite(Number(record.latitude))) continue;
    const image = imageFor(record);
    const sports = (record.activities || "").split(/\s+-\s+/)
      .map((item) => item.trim()).filter(Boolean).slice(0, 20);
    const data = {
      name: record.name.trim(), category: "CLUB",
      headline: `${record.type || "Club"} en ${record.neighborhood || "Ciudad de Buenos Aires"}`,
      description: "Información inicial tomada del registro público de clubes de la Ciudad de Buenos Aires. El club puede reclamar esta ficha para actualizar sus actividades y contar su historia.",
      sport: sports[0] || null, sports, city: "Ciudad de Buenos Aires",
      neighborhood: record.neighborhood || null,
      address: record.address.replace(/\s+/g, " ").trim(),
      latitude: Number(record.latitude), longitude: Number(record.longitude),
      website: cleanWebsite(record.website),
      details: { ...(record.facilities ? { facilities: record.facilities.slice(0, 500) } : {}) },
      sourceKey: record.key, sourceName: "Buenos Aires Data · Clubes",
      sourceUrl, sourceUpdatedAt: process.argv.includes("--live") ? new Date() : new Date("2026-10-02T00:00:00Z"),
      sourceContact: { email: record.email || null, phone: record.phone || null },
      imageUrl: image.path,
      imageCredit: `${image.author || "Wikimedia Commons"} · ${image.license}`.slice(0, 300),
      imageSourceUrl: image.source, imageIllustrative: image.illustrative,
      isDemo: false, verification: "UNVERIFIED", status: "PUBLISHED",
    };
    const existing = await prisma.profile.findUnique({ where: { sourceKey: record.key } });
    if (existing) {
      if (existing.claimedById || existing.verification === "VERIFIED") continue;
      await prisma.profile.update({
        where: { id: existing.id },
        data: {
          ...data, verification: existing.verification, status: existing.status,
          imageUrl: existing.imageIllustrative || !existing.imageUrl ? data.imageUrl : existing.imageUrl,
          imageCredit: existing.imageIllustrative || !existing.imageUrl || existing.imageUrl === data.imageUrl ? data.imageCredit : existing.imageCredit,
          imageSourceUrl: existing.imageIllustrative || !existing.imageUrl ? data.imageSourceUrl : existing.imageSourceUrl,
          imageIllustrative: existing.imageIllustrative || !existing.imageUrl ? data.imageIllustrative : existing.imageIllustrative,
        },
      });
      updated++;
    } else {
      const duplicate = await prisma.profile.findFirst({
        where: {
          name: { equals: data.name, mode: "insensitive" },
          address: { equals: data.address, mode: "insensitive" },
        },
      });
      if (duplicate) continue;
      await prisma.profile.create({ data });
      created++;
    }
  }
  console.log(`Padrón importado: ${created} fichas nuevas, ${updated} actualizadas. ${removedProfiles.count} fichas ficticias retiradas.`);
} finally {
  await prisma.$disconnect();
}
