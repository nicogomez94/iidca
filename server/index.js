import "dotenv/config";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import rateLimit from "express-rate-limit";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";

const app = express();
app.set("trust proxy", 1);
const prisma = new PrismaClient();
const port = Number(process.env.PORT || 4000);
const host = process.env.HOST || '127.0.0.1';
const tokenName = "iidca_session";
const demoMode = process.env.DEMO_MODE === "true";
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
  "imageUrl",
  "details",
];

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error("Configurá JWT_SECRET con al menos 32 caracteres en .env");
}

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "64kb" }));
app.use(cookieParser());
app.use((req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.get("Origin");
  const allowedOrigins = [`${req.protocol}://${req.get("host")}`];
  if (process.env.NODE_ENV !== "production") allowedOrigins.push("http://127.0.0.1:5173", "http://localhost:5173");
  if (origin && !allowedOrigins.includes(origin))
    return res.status(403).json({ error: "Origen de solicitud no permitido." });
  next();
});
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 12, standardHeaders: "draft-8", legacyHeaders: false, message: { error: "Demasiados intentos. Probá más tarde." } });
const claimLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 8, standardHeaders: "draft-8", legacyHeaders: false, message: { error: "Demasiadas solicitudes. Probá más tarde." } });
const contactLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 5, standardHeaders: "draft-8", legacyHeaders: false, message: { error: "Demasiados mensajes. Probá más tarde." } });

function activeProfile(user) {
  return user.claimedProfile || user.profile;
}
function accountData(user) {
  const profile = activeProfile(user);
  return { id: user.id, email: user.email, role: user.role, profile: profile ? safeProfile(profile, true) : null };
}
async function audit(actorId, action, targetId, detail) {
  await prisma.auditEvent.create({ data: { actorId, action, targetId, detail } });
}

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
    "imageUrl",
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
  if (Object.hasOwn(data, "imageUrl") && data.imageUrl && !/^https:\/\/[^\s]+$/i.test(data.imageUrl) && !/^\/images\/[\w./-]+$/.test(data.imageUrl))
    throw validationError("La foto debe tener una URL HTTPS válida.");
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

function safeProfile(profile, includePrivate = false, includeSource = false) {
  const { userId, claimedById, sourceContact, claims, user, claimedBy, ...publicData } = profile;
  if (includeSource) publicData.sourceContact = sourceContact;
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
      include: { profile: true, claimedProfile: true },
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

app.post("/api/contact", contactLimiter, async (req, res) => {
  const name = cleanText(req.body.name, 120);
  const email = cleanText(req.body.email, 200);
  const message = cleanText(req.body.message, 3000);
  if (req.body.company) return res.json({ success: true });
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !message)
    return res.status(400).json({ error: "Completá nombre, email válido y mensaje." });
  if (!process.env.CONTACT_TO || !process.env.CONTACT_SITE)
    return res.status(503).json({ error: "El contacto todavía no está configurado." });
  try {
    const upstream = await fetch("https://contact-form-service-e8aa.onrender.com/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, message, to: process.env.CONTACT_TO, site: process.env.CONTACT_SITE, company: "" }),
      signal: AbortSignal.timeout(20000),
    });
    const data = await upstream.json().catch(() => null);
    if (!upstream.ok || data?.success !== true)
      return res.status(502).json({ error: "No se pudo enviar el mensaje. Probá nuevamente." });
    res.json({ success: true });
  } catch {
    res.status(502).json({ error: "No se pudo enviar el mensaje. Probá nuevamente." });
  }
});

app.post("/api/auth/register", authLimiter, async (req, res, next) => {
  try {
    const { email, password, role, acceptedTerms, publicConsent } = req.body;
    const normalizedEmail = cleanText(email, 200).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail))
      return res.status(400).json({ error: "Ingresá un email válido." });
    if (!demoMode && (typeof password !== "string" || password.length < 8))
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
        passwordHash: await bcrypt.hash(demoMode ? crypto.randomBytes(32).toString("hex") : password, 12),
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
      include: { profile: true, claimedProfile: true },
    });
    sessionCookie(res, user);
    res.status(201).json({ user: accountData(user) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/login", authLimiter, async (req, res) => {
  const email = cleanText(req.body.email, 200).toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
    include: { profile: true, claimedProfile: true },
  });
  if (!user || (!demoMode && !(await bcrypt.compare(req.body.password || "", user.passwordHash)))) {
    return res.status(401).json({ error: "Email o contraseña incorrectos." });
  }
  if ((req.body.adminPortal === true) !== (user.role === "ADMIN"))
    return res.status(403).json({ error: user.role === "ADMIN" ? "Ingresá desde el acceso de administración." : "Este acceso es solo para administración." });
  sessionCookie(res, user);
  res.json({ user: accountData(user) });
});

app.post("/api/auth/logout", (_req, res) => {
  res.clearCookie(tokenName, { path: "/" });
  res.json({ ok: true });
});

app.get("/api/me", auth, (req, res) => {
  res.json({ user: accountData(req.user) });
});

app.patch("/api/me/profile", auth, async (req, res, next) => {
  try {
    const ownedProfile = activeProfile(req.user);
    if (!ownedProfile)
      return res.status(404).json({ error: "No tenés un perfil editable." });
    const data = normalizeProfile(req.body);
    if (req.user.role === "ATHLETE") delete data.email;
    const profile = await prisma.profile.update({
      where: { id: ownedProfile.id },
      data: {
        ...data,
        status: req.user.role === "ATHLETE" ? "HIDDEN" : "PENDING",
      },
    });
    await audit(req.user.id, "PROFILE_EDIT", profile.id, { name: profile.name });
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
      if (a.verification !== b.verification && (a.verification === "VERIFIED" || b.verification === "VERIFIED"))
        return a.verification === "VERIFIED" ? -1 : 1;
      if (hasCoordinates)
        return (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity);
      if (priority[a.category] !== priority[b.category]) return priority[a.category] - priority[b.category];
      if (Boolean(a.imageUrl && !a.imageIllustrative) !== Boolean(b.imageUrl && !b.imageIllustrative))
        return a.imageUrl && !a.imageIllustrative ? -1 : 1;
      return a.name.localeCompare(b.name, "es");
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

app.post("/api/profiles/:id/claim", claimLimiter, auth, async (req, res, next) => {
  try {
    if (!["CLUB", "FEDERATION"].includes(req.user.role))
      return res.status(403).json({ error: "Ingresá con una cuenta de club u organización para reclamar una ficha." });
    const evidence = cleanText(req.body.evidence, 1000);
    if (evidence.length < 30)
      return res.status(400).json({ error: "Contanos cómo podemos comprobar tu vínculo con la institución (mínimo 30 caracteres)." });
    const profile = await prisma.profile.findUnique({ where: { id: req.params.id } });
    if (!profile || profile.category !== "CLUB" || !profile.sourceKey || profile.verification === "VERIFIED")
      return res.status(404).json({ error: "Esta ficha no admite reclamos." });
    if (req.user.claimedProfile)
      return res.status(409).json({ error: "Tu cuenta ya administra una ficha verificada." });
    const existing = await prisma.claimRequest.findFirst({ where: { profileId: profile.id, status: "PENDING" } });
    if (existing)
      return res.status(409).json({ error: "Ya hay un reclamo pendiente para esta ficha. Escribí a IIDCA para consultar su estado." });
    const claim = await prisma.$transaction(async (tx) => {
      const request = await tx.claimRequest.upsert({
        where: { profileId_userId: { profileId: profile.id, userId: req.user.id } },
        create: { profileId: profile.id, userId: req.user.id, evidence },
        update: { evidence, status: "PENDING", reviewedAt: null },
      });
      await tx.profile.update({ where: { id: profile.id }, data: { verification: "CLAIM_PENDING" } });
      return request;
    });
    await audit(req.user.id, "CLAIM_SUBMITTED", profile.id, { claimId: claim.id });
    res.status(201).json({ claim: { id: claim.id, status: claim.status } });
  } catch (error) { next(error); }
});

app.get("/api/admin/overview", auth, adminOnly, async (_req, res, next) => {
  try {
    const [users, profiles, categories, claims] = await Promise.all([
      prisma.user.count(),
      prisma.profile.findMany({ orderBy: { createdAt: "desc" }, take: 1000, include: { user: { select: { email: true } }, claimedBy: { select: { email: true } } } }),
      prisma.profile.groupBy({ by: ["category"], _count: { id: true } }),
      prisma.claimRequest.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "asc" }, include: { user: { select: { email: true, profile: { select: { name: true } } } }, profile: { select: { name: true, sourceUrl: true } } } }),
    ]);
    res.json({
      users,
      profiles: profiles.map((profile) => ({ ...safeProfile(profile, true, true), accountEmail: profile.user?.email || profile.claimedBy?.email || null })),
      categories,
      claims: claims.map((claim) => ({ id: claim.id, profileId: claim.profileId, profileName: claim.profile.name, applicant: claim.user.email, applicantName: claim.user.profile?.name, evidence: claim.evidence, createdAt: claim.createdAt })),
    });
  } catch (error) {
    next(error);
  }
});

function newsInput(input) {
  const article = {
    title: cleanText(input.title, 140),
    excerpt: cleanText(input.excerpt, 320),
    body: cleanText(input.body, 8000),
    category: cleanText(input.category, 55),
    imageUrl: cleanText(input.imageUrl, 500),
    imageAlt: cleanText(input.imageAlt, 180),
    published: input.published === true,
  };
  if (!article.title || !article.excerpt || !article.body || !article.category || !article.imageUrl || !article.imageAlt)
    throw validationError("Completá todos los campos de la novedad.");
  if (!/^https:\/\/[^\s]+$/i.test(article.imageUrl) && !/^\/images\/[\w./-]+$/.test(article.imageUrl))
    throw validationError("La foto debe ser una URL HTTPS o una imagen del sitio.");
  return article;
}

app.get("/api/news", async (_req, res, next) => {
  try {
    const articles = await prisma.newsArticle.findMany({ where: { published: true }, orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }] });
    res.json({ articles });
  } catch (error) { next(error); }
});

app.get("/api/news/:slug", async (req, res, next) => {
  try {
    const article = await prisma.newsArticle.findUnique({ where: { slug: req.params.slug } });
    if (!article?.published) return res.status(404).json({ error: "Novedad no encontrada." });
    res.json({ article });
  } catch (error) { next(error); }
});

app.get("/api/admin/news", auth, adminOnly, async (_req, res, next) => {
  try {
    const articles = await prisma.newsArticle.findMany({ orderBy: { createdAt: "desc" } });
    res.json({ articles });
  } catch (error) { next(error); }
});

app.post("/api/admin/news", auth, adminOnly, async (req, res, next) => {
  try {
    const data = newsInput(req.body);
    const slugBase = data.title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 75) || "novedad";
    const article = await prisma.newsArticle.create({ data: { ...data, slug: `${slugBase}-${crypto.randomBytes(3).toString("hex")}`, publishedAt: data.published ? new Date() : null } });
    await audit(req.user.id, "NEWS_CREATED", article.id, { title: article.title });
    res.status(201).json({ article });
  } catch (error) { next(error); }
});

app.patch("/api/admin/news/:id", auth, adminOnly, async (req, res, next) => {
  try {
    const existing = await prisma.newsArticle.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Novedad no encontrada." });
    const data = newsInput(req.body);
    const article = await prisma.newsArticle.update({ where: { id: existing.id }, data: { ...data, publishedAt: data.published ? existing.publishedAt || new Date() : null } });
    await audit(req.user.id, "NEWS_UPDATED", article.id, { published: article.published });
    res.json({ article });
  } catch (error) { next(error); }
});

app.delete("/api/admin/news/:id", auth, adminOnly, async (req, res, next) => {
  try {
    const existing = await prisma.newsArticle.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Novedad no encontrada." });
    await prisma.newsArticle.delete({ where: { id: existing.id } });
    await audit(req.user.id, "NEWS_DELETED", existing.id, { title: existing.title });
    res.json({ ok: true });
  } catch (error) { next(error); }
});

app.patch("/api/admin/claims/:id", auth, adminOnly, async (req, res, next) => {
  try {
    const decision = cleanText(req.body.decision, 10);
    if (!["APPROVED", "REJECTED"].includes(decision)) throw validationError("Decisión inválida.");
    const claim = await prisma.claimRequest.findUnique({ where: { id: req.params.id }, include: { profile: true, user: { include: { claimedProfile: true, profile: true } } } });
    if (!claim || claim.status !== "PENDING") return res.status(404).json({ error: "Reclamo pendiente no encontrado." });
    if (decision === "APPROVED" && (claim.profile.claimedById || claim.user.claimedProfile))
      return res.status(409).json({ error: "La ficha o la cuenta ya tienen una vinculación activa." });
    await prisma.$transaction(async (tx) => {
      await tx.claimRequest.update({ where: { id: claim.id }, data: { status: decision, reviewedAt: new Date() } });
      await tx.profile.update({ where: { id: claim.profileId }, data: decision === "APPROVED"
        ? { verification: "VERIFIED", claimedById: claim.userId, status: "PUBLISHED" }
        : { verification: "UNVERIFIED" } });
      if (decision === "APPROVED" && claim.user.profile)
        await tx.profile.update({ where: { id: claim.user.profile.id }, data: { status: "HIDDEN" } });
    });
    await audit(req.user.id, `CLAIM_${decision}`, claim.profileId, { claimId: claim.id, applicant: claim.user.email });
    res.json({ ok: true });
  } catch (error) { next(error); }
});

app.get("/api/admin/export/:format", auth, adminOnly, async (req, res, next) => {
  try {
    const format = req.params.format;
    if (!["xlsx", "pdf"].includes(format)) throw validationError("Formato inválido.");
    const filters = {
      q: cleanText(req.query.q, 100),
      category: cleanText(req.query.category, 30),
      status: cleanText(req.query.status, 30),
      sport: cleanText(req.query.sport, 60),
      location: cleanText(req.query.location, 100),
    };
    if (filters.category && !allowedRoles.includes(filters.category)) throw validationError("Tipo de perfil inválido.");
    if (filters.status && !["PENDING", "PUBLISHED", "HIDDEN"].includes(filters.status)) throw validationError("Estado inválido.");
    const conditions = [];
    if (filters.category) conditions.push({ category: filters.category });
    if (filters.status) conditions.push({ status: filters.status });
    if (filters.sport) conditions.push({ OR: [{ sports: { has: filters.sport } }, { sport: filters.sport }] });
    if (filters.location) conditions.push({ OR: [{ city: { contains: filters.location, mode: "insensitive" } }, { neighborhood: { contains: filters.location, mode: "insensitive" } }] });
    if (filters.q) conditions.push({ OR: [
      { name: { contains: filters.q, mode: "insensitive" } },
      { city: { contains: filters.q, mode: "insensitive" } },
      { neighborhood: { contains: filters.q, mode: "insensitive" } },
      { user: { is: { email: { contains: filters.q, mode: "insensitive" } } } },
      { claimedBy: { is: { email: { contains: filters.q, mode: "insensitive" } } } },
    ] });
    const profiles = await prisma.profile.findMany({ where: { AND: conditions }, include: { user: { select: { email: true } }, claimedBy: { select: { email: true } } }, orderBy: { name: "asc" } });
    if (!profiles.length) return res.status(404).json({ error: "No hay perfiles para exportar con esos filtros." });
    await audit(req.user.id, `EXPORT_${format.toUpperCase()}`, null, { records: profiles.length, filters });
    const rows = profiles.map((profile) => ({
      name: profile.name, type: profile.category, verification: profile.verification,
      status: profile.status, sports: profile.sports.join(", "), city: profile.city,
      neighborhood: profile.neighborhood || "", address: profile.address || "",
      account: profile.claimedBy?.email || profile.user?.email || "",
      publicEmail: profile.email || "", publicPhone: profile.phone || "",
      sourceEmail: profile.sourceContact?.email || "", sourcePhone: profile.sourceContact?.phone || "",
      website: profile.website || "", source: profile.sourceName || "",
      sourceUrl: profile.sourceUrl || "", updated: profile.updatedAt.toISOString().slice(0, 10),
    }));
    res.setHeader("Cache-Control", "no-store");
    if (format === "xlsx") {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Padrón IIDCA");
      sheet.columns = Object.keys(rows[0] || { name: "" }).map((key) => ({ header: key, key, width: Math.min(55, Math.max(16, key.length + 4)) }));
      sheet.addRows(rows);
      sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF090C70" } };
      sheet.views = [{ state: "frozen", ySplit: 1 }];
      sheet.autoFilter = { from: "A1", to: `${String.fromCharCode(64 + sheet.columnCount)}1` };
      res.type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.attachment("iidca-padron.xlsx");
      return res.send(Buffer.from(await workbook.xlsx.writeBuffer()));
    }
    res.type("application/pdf");
    res.attachment("iidca-padron.pdf");
    const pdf = new PDFDocument({ margin: 44, size: "A4" });
    pdf.pipe(res);
    pdf.fontSize(18).fillColor("#090c70").text("Padrón privado IIDCA");
    pdf.fontSize(9).fillColor("#555").text(`${rows.length} registros · ${new Date().toLocaleDateString("es-AR")}`);
    pdf.moveDown();
    for (const row of rows) {
      if (pdf.y > 725) pdf.addPage();
      pdf.fontSize(11).fillColor("#090c70").text(row.name, { continued: false });
      pdf.fontSize(8).fillColor("#333").text(`${row.type} · ${row.verification} · ${row.neighborhood}, ${row.city}`);
      pdf.text(`Dirección: ${row.address || "—"} · Deportes: ${row.sports || "—"}`);
      pdf.text(`Contacto: ${row.account || row.sourceEmail || row.publicEmail || "—"} · ${row.sourcePhone || row.publicPhone || "—"}`);
      pdf.moveDown(0.7);
    }
    pdf.end();
  } catch (error) { next(error); }
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
      await audit(req.user.id, "PROFILE_STATUS", profile.id, { status });
      res.json({ profile: safeProfile(profile, true) });
    } catch (error) {
      next(error);
    }
  },
);

app.patch("/api/admin/profile-data/:id", auth, adminOnly, async (req, res, next) => {
  try {
    const existing = await prisma.profile.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Ficha no encontrada." });
    const data = normalizeProfile(req.body);
    if (existing.category === "ATHLETE")
      return res.status(403).json({ error: "Los perfiles personales se editan desde la cuenta del titular." });
    const profile = await prisma.profile.update({ where: { id: existing.id }, data });
    await audit(req.user.id, "PROFILE_ADMIN_EDIT", profile.id, { fields: Object.keys(data) });
    res.json({ profile: safeProfile(profile, true, true) });
  } catch (error) { next(error); }
});

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
