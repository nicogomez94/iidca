import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const app = express();
const prisma = new PrismaClient();
const port = Number(process.env.PORT || 4000);
const host = process.env.HOST || '127.0.0.1';
const tokenName = "iidca_session";
const publicRoles = ["PROFESSIONAL", "CLUB", "FEDERATION", "SPONSOR"];
const allowedRoles = ["ATHLETE", ...publicRoles];
const profileFields = [
  "name",
  "headline",
  "description",
  "sport",
  "sports",
  "city",
  "neighborhood",
  "address",
  "latitude",
  "longitude",
  "email",
  "phone",
  "instagram",
  "website",
  "details",
];

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error("Configurá JWT_SECRET con al menos 32 caracteres en .env");
}

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "64kb" }));
app.use(cookieParser());

function cleanText(value, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function validationError(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function normalizeProfile(input) {
  const data = {};
  for (const field of profileFields) {
    if (Object.hasOwn(input, field)) data[field] = input[field];
  }
  for (const field of [
    "name",
    "headline",
    "description",
    "sport",
    "city",
    "neighborhood",
    "address",
    "email",
    "phone",
    "instagram",
    "website",
  ]) {
    if (Object.hasOwn(data, field))
      data[field] =
        cleanText(data[field], field === "description" ? 1200 : 200) || null;
  }
  if (data.name === null || data.city === null)
    throw validationError("Completá el nombre y la ciudad.");
  if (Object.hasOwn(data, "sports")) {
    data.sports = Array.isArray(data.sports)
      ? [
          ...new Set(
            data.sports.map((sport) => cleanText(sport, 60)).filter(Boolean),
          ),
        ].slice(0, 10)
      : [];
  }
  if (Object.hasOwn(data, "latitude")) {
    data.latitude =
      data.latitude === "" || data.latitude == null
        ? null
        : Number(data.latitude);
    if (
      data.latitude !== null &&
      (!Number.isFinite(data.latitude) || Math.abs(data.latitude) > 90)
    )
      throw validationError("Latitud inválida.");
  }
  if (Object.hasOwn(data, "longitude")) {
    data.longitude =
      data.longitude === "" || data.longitude == null
        ? null
        : Number(data.longitude);
    if (
      data.longitude !== null &&
      (!Number.isFinite(data.longitude) || Math.abs(data.longitude) > 180)
    )
      throw validationError("Longitud inválida.");
  }
  if (Object.hasOwn(data, "details")) {
    if (
      !data.details ||
      typeof data.details !== "object" ||
      Array.isArray(data.details)
    )
      data.details = {};
    const details = {};
    for (const [key, value] of Object.entries(data.details).slice(0, 30)) {
      if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
      ) {
        details[cleanText(key, 50)] =
          typeof value === "string" ? cleanText(value, 500) : value;
      }
    }
    data.details = details;
  }
  return data;
}

function safeProfile(profile, includePrivate = false) {
  const { userId, ...publicData } = profile;
  if (!includePrivate) {
    const allowedDetails = {
      CLUB: ["levels", "schedule", "facilities", "ages"],
      PROFESSIONAL: [
        "profession",
        "mode",
        "specialty",
        "education",
        "experience",
      ],
      FEDERATION: ["region", "founded", "socialPractice", "beginners"],
      SPONSOR: ["sector", "support", "supportType"],
    };
    publicData.details = Object.fromEntries(
      Object.entries(publicData.details || {}).filter(([key]) =>
        allowedDetails[profile.category]?.includes(key),
      ),
    );
  }
  return publicData;
}

function sessionCookie(res, user) {
  const token = jwt.sign(
    { sub: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );
  res.cookie(tokenName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

async function auth(req, res, next) {
  const token = req.cookies[tokenName];
  if (!token)
    return res.status(401).json({ error: "Iniciá sesión para continuar." });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: { profile: true },
    });
    if (!req.user) return res.status(401).json({ error: "Sesión inválida." });
    next();
  } catch {
    return res
      .status(401)
      .json({ error: "La sesión venció. Volvé a ingresar." });
  }
}

function adminOnly(req, res, next) {
  if (req.user.role !== "ADMIN")
    return res.status(403).json({ error: "Acceso restringido." });
  next();
}

function distanceKm(aLat, aLng, bLat, bLng) {
  const rad = (value) => (value * Math.PI) / 180;
  const deltaLat = rad(bLat - aLat);
  const deltaLng = rad(bLng - aLng);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(deltaLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

app.get("/api/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true });
  } catch {
    res.status(503).json({ ok: false });
  }
});

app.post("/api/auth/register", async (req, res, next) => {
  try {
    const { email, password, role, acceptedTerms, publicConsent } = req.body;
    const normalizedEmail = cleanText(email, 200).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail))
      return res.status(400).json({ error: "Ingresá un email válido." });
    if (typeof password !== "string" || password.length < 8)
      return res
        .status(400)
        .json({ error: "La contraseña necesita al menos 8 caracteres." });
    if (!allowedRoles.includes(role))
      return res.status(400).json({ error: "Elegí un tipo de perfil válido." });
    if (!acceptedTerms)
      return res
        .status(400)
        .json({
          error: "Confirmá que sos mayor de 18 años y aceptás las condiciones.",
        });
    if (publicRoles.includes(role) && !publicConsent)
      return res
        .status(400)
        .json({
          error: "Autorizá la publicación de los datos de contacto del perfil.",
        });
    const profile = normalizeProfile(req.body.profile || {});
    if (!profile.name || !profile.city)
      return res.status(400).json({ error: "Completá el nombre y la ciudad." });
    if (role === "ATHLETE" && Number(profile.details?.age) < 18)
      return res
        .status(400)
        .json({ error: "El registro requiere ser mayor de 18 años." });
    if (await prisma.user.findUnique({ where: { email: normalizedEmail } }))
      return res
        .status(409)
        .json({ error: "Ya existe una cuenta con ese email." });
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash: await bcrypt.hash(password, 12),
        role,
        profile: {
          create: {
            ...profile,
            name: profile.name,
            city: profile.city,
            category: role,
            sports: profile.sports || (profile.sport ? [profile.sport] : []),
            status: role === "ATHLETE" ? "HIDDEN" : "PENDING",
          },
        },
      },
      include: { profile: true },
    });
    sessionCookie(res, user);
    res
      .status(201)
      .json({
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          profile: safeProfile(user.profile, true),
        },
      });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/login", async (req, res) => {
  const email = cleanText(req.body.email, 200).toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
    include: { profile: true },
  });
  if (
    !user ||
    !(await bcrypt.compare(req.body.password || "", user.passwordHash))
  ) {
    return res.status(401).json({ error: "Email o contraseña incorrectos." });
  }
  sessionCookie(res, user);
  res.json({
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      profile: user.profile ? safeProfile(user.profile, true) : null,
    },
  });
});

app.post("/api/auth/logout", (_req, res) => {
  res.clearCookie(tokenName, { path: "/" });
  res.json({ ok: true });
});

app.get("/api/me", auth, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      profile: req.user.profile ? safeProfile(req.user.profile, true) : null,
    },
  });
});

app.patch("/api/me/profile", auth, async (req, res, next) => {
  try {
    if (!req.user.profile)
      return res.status(404).json({ error: "No tenés un perfil editable." });
    const data = normalizeProfile(req.body);
    if (req.user.role === "ATHLETE") delete data.email;
    const profile = await prisma.profile.update({
      where: { userId: req.user.id },
      data: {
        ...data,
        status: req.user.role === "ATHLETE" ? "HIDDEN" : "PENDING",
      },
    });
    res.json({ profile: safeProfile(profile, true) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/profiles", async (req, res, next) => {
  try {
    const sport = cleanText(req.query.sport, 80);
    const location = cleanText(req.query.location, 80);
    const category = cleanText(req.query.category, 30);
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const hasCoordinates =
      req.query.lat !== undefined &&
      req.query.lng !== undefined &&
      Number.isFinite(lat) &&
      Number.isFinite(lng);
    const profiles = await prisma.profile.findMany({
      where: {
        status: "PUBLISHED",
        category: publicRoles.includes(category)
          ? category
          : { in: publicRoles },
        ...(location
          ? {
              OR: [
                { city: { contains: location, mode: "insensitive" } },
                { neighborhood: { contains: location, mode: "insensitive" } },
                { address: { contains: location, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: [{ isDemo: "asc" }, { createdAt: "desc" }],
    });
    const matching = sport
      ? profiles.filter((profile) =>
          [profile.sport, ...(profile.sports || [])].some((item) =>
            item
              ?.toLocaleLowerCase("es")
              .includes(sport.toLocaleLowerCase("es")),
          ),
        )
      : profiles;
    const result = matching.map((profile) => ({
      ...safeProfile(profile),
      distanceKm:
        hasCoordinates &&
        profile.latitude !== null &&
        profile.longitude !== null
          ? Math.round(
              distanceKm(lat, lng, profile.latitude, profile.longitude) * 10,
            ) / 10
          : null,
    }));
    const priority = { CLUB: 0, PROFESSIONAL: 1, FEDERATION: 2, SPONSOR: 3 };
    result.sort((a, b) => {
      if (a.isDemo !== b.isDemo) return Number(a.isDemo) - Number(b.isDemo);
      if (hasCoordinates)
        return (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity);
      return priority[a.category] - priority[b.category];
    });
    res.json({ profiles: result });
  } catch (error) {
    next(error);
  }
});

app.get("/api/profiles/:id", async (req, res, next) => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { id: req.params.id },
    });
    if (
      !profile ||
      profile.status !== "PUBLISHED" ||
      profile.category === "ATHLETE"
    )
      return res.status(404).json({ error: "Perfil no encontrado." });
    res.json({ profile: safeProfile(profile) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/overview", auth, adminOnly, async (_req, res, next) => {
  try {
    const [users, profiles, categories] = await Promise.all([
      prisma.user.count(),
      prisma.profile.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
      prisma.profile.groupBy({ by: ["category"], _count: { id: true } }),
    ]);
    res.json({
      users,
      profiles: profiles.map((profile) => safeProfile(profile, true)),
      categories,
    });
  } catch (error) {
    next(error);
  }
});

app.patch(
  "/api/admin/profiles/:id",
  auth,
  adminOnly,
  async (req, res, next) => {
    try {
      const status = cleanText(req.body.status, 20);
      if (!["PENDING", "PUBLISHED", "HIDDEN"].includes(status))
        return res.status(400).json({ error: "Estado inválido." });
      const existing = await prisma.profile.findUnique({
        where: { id: req.params.id },
      });
      if (!existing)
        return res.status(404).json({ error: "Perfil no encontrado." });
      if (existing.category === "ATHLETE" && status === "PUBLISHED")
        return res
          .status(400)
          .json({ error: "Los perfiles deportivos personales son privados." });
      const profile = await prisma.profile.update({
        where: { id: req.params.id },
        data: { status },
      });
      res.json({ profile: safeProfile(profile, true) });
    } catch (error) {
      next(error);
    }
  },
);

const dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.resolve(dirname, "../dist");
app.use("/api", (_req, res) =>
  res.status(404).json({ error: "Ruta no encontrada." }),
);
app.use(express.static(distPath));
app.get("/{*path}", (_req, res) =>
  res.sendFile(path.join(distPath, "index.html")),
);

app.use((error, _req, res, _next) => {
  if (error.status === 400)
    return res.status(400).json({ error: error.message });
  if (error.code === "P2002")
    return res
      .status(409)
      .json({ error: "Ya existe un registro con esos datos." });
  console.error(error);
  res.status(500).json({ error: "Ocurrió un error. Intentá de nuevo." });
});

app.listen(port, host, () =>
  console.log(`IIDCA Social Club API: http://${host}:${port}`),
);
