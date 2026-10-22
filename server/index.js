import "dotenv/config";
import path from "node:path";
import crypto from "node:crypto";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";
import jwt from "jsonwebtoken";
import multer from "multer";
import { PrismaClient } from "@prisma/client";
import rateLimit from "express-rate-limit";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { buildImportTemplate, importError, parseImportFile, validateImportRow } from "./profileImport.js";

const app = express();
app.set("trust proxy", 1);
const prisma = new PrismaClient();
const dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = process.env.UPLOAD_DIR || path.resolve(dirname, "../uploads");
fs.mkdirSync(uploadDir, { recursive: true });
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
app.use("/uploads", express.static(uploadDir, { immutable: true, maxAge: "1y", fallthrough: false }));
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
const importLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: "draft-8", legacyHeaders: false, message: { error: "Demasiadas cargas. Probá en unos minutos." } });
const accountProfileInclude = {
  verificationRequests: { orderBy: { createdAt: "desc" }, take: 1 },
  profilePhotos: { orderBy: { createdAt: "asc" } },
  facilities: {
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: { photos: { orderBy: { createdAt: "asc" } } },
  },
};

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

const facilityPhotoUpload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (_req, file, callback) => {
      const extensions = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };
      callback(null, `${Date.now()}-${crypto.randomBytes(12).toString("hex")}${extensions[file.mimetype] || ""}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.mimetype))
      return callback(validationError("La foto debe ser JPG, PNG o WebP."));
    callback(null, true);
  },
});

const profilePhotoUpload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (_req, file, callback) => {
      const extensions = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };
      callback(null, `${Date.now()}-${crypto.randomBytes(12).toString("hex")}${extensions[file.mimetype] || ""}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.mimetype))
      return callback(validationError("La foto debe ser JPG, PNG o WebP."));
    callback(null, true);
  },
});

function normalizeFacilities(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => cleanText(typeof item === "string" ? item : item?.name, 120)).filter(Boolean))].slice(0, 12);
}

async function syncClubVerification(profileId, client = prisma) {
  const facilities = await client.clubFacility.findMany({
    where: { profileId },
    select: { _count: { select: { photos: true } } },
  });
  const photographed = facilities.filter((facility) => facility._count.photos > 0).length;
  const verification = facilities.length > 0 && photographed === facilities.length ? "VERIFIED" : "UNVERIFIED";
  await client.profile.update({ where: { id: profileId }, data: { verification } });
  return { verification, total: facilities.length, photographed };
}

function ownedClubProfile(req) {
  const profile = activeProfile(req.user);
  if (req.user.role !== "CLUB" || !profile || profile.category !== "CLUB") return null;
  return profile;
}

async function accountProfile(profileId) {
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    include: accountProfileInclude,
  });
  return safeProfile(profile, true);
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
  const { userId, claimedById, sourceContact, claims, verificationRequests, user, claimedBy, ...publicData } = profile;
  if (includePrivate)
    publicData.verificationRequestStatus = verificationRequests?.[0]?.status || null;
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
      include: {
        profile: { include: accountProfileInclude },
        claimedProfile: { include: accountProfileInclude },
      },
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
    const facilities = normalizeFacilities(req.body.profile?.facilities);
    if (!profile.name || !profile.city)
      return res.status(400).json({ error: "Completá el nombre y la ciudad." });
    if (role === "CLUB" && facilities.length === 0)
      return res.status(400).json({ error: "Declaración de instalaciones: agregá al menos una instalación del club." });
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
            facilities: role === "CLUB"
              ? { create: facilities.map((name, sortOrder) => ({ name, sortOrder })) }
              : undefined,
          },
        },
      },
      include: {
        profile: { include: accountProfileInclude },
        claimedProfile: { include: accountProfileInclude },
      },
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
    include: {
      profile: { include: accountProfileInclude },
      claimedProfile: { include: accountProfileInclude },
    },
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
      include: accountProfileInclude,
    });
    await audit(req.user.id, "PROFILE_EDIT", profile.id, { name: profile.name });
    res.json({ profile: safeProfile(profile, true) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/me/profile-photos", auth, profilePhotoUpload.single("photo"), async (req, res, next) => {
  try {
    const profile = activeProfile(req.user);
    if (!profile) {
      if (req.file) await fs.promises.unlink(req.file.path).catch(() => {});
      return res.status(404).json({ error: "No tenés un perfil editable." });
    }
    if (!req.file) throw validationError("Elegí una foto para subir.");
    const count = await prisma.profilePhoto.count({ where: { profileId: profile.id } });
    if (count >= 8) {
      await fs.promises.unlink(req.file.path).catch(() => {});
      throw validationError("Podés guardar hasta 8 fotos en tu perfil.");
    }
    const url = `/uploads/${req.file.filename}`;
    try {
      await prisma.$transaction(async (tx) => {
        await tx.profilePhoto.create({ data: { profileId: profile.id, url } });
        if (!profile.imageUrl)
          await tx.profile.update({ where: { id: profile.id }, data: { imageUrl: url, imageIllustrative: false } });
      });
    } catch (error) {
      await fs.promises.unlink(req.file.path).catch(() => {});
      throw error;
    }
    await audit(req.user.id, "PROFILE_PHOTO_ADDED", profile.id, {});
    res.status(201).json({ profile: await accountProfile(profile.id) });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/me/profile-photos/:id/cover", auth, async (req, res, next) => {
  try {
    const profile = activeProfile(req.user);
    const photo = profile
      ? await prisma.profilePhoto.findFirst({ where: { id: req.params.id, profileId: profile.id } })
      : null;
    if (!photo) return res.status(404).json({ error: "Foto no encontrada." });
    await prisma.profile.update({
      where: { id: profile.id },
      data: { imageUrl: photo.url, imageIllustrative: false, imageCredit: null, imageSourceUrl: null },
    });
    await audit(req.user.id, "PROFILE_PHOTO_COVER", profile.id, { photoId: photo.id });
    res.json({ profile: await accountProfile(profile.id) });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/me/profile-photos/:id", auth, async (req, res, next) => {
  try {
    const profile = activeProfile(req.user);
    const photo = profile
      ? await prisma.profilePhoto.findFirst({ where: { id: req.params.id, profileId: profile.id } })
      : null;
    if (!photo) return res.status(404).json({ error: "Foto no encontrada." });
    await prisma.$transaction(async (tx) => {
      await tx.profilePhoto.delete({ where: { id: photo.id } });
      if (profile.imageUrl === photo.url) {
        const replacement = await tx.profilePhoto.findFirst({
          where: { profileId: profile.id, id: { not: photo.id } },
          orderBy: { createdAt: "asc" },
        });
        await tx.profile.update({ where: { id: profile.id }, data: { imageUrl: replacement?.url || null } });
      }
    });
    if (photo.url.startsWith("/uploads/"))
      await fs.promises.unlink(path.join(uploadDir, path.basename(photo.url))).catch(() => {});
    await audit(req.user.id, "PROFILE_PHOTO_DELETED", profile.id, { photoId: photo.id });
    res.json({ profile: await accountProfile(profile.id) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/me/verification-request", claimLimiter, auth, async (req, res, next) => {
  try {
    const profile = ownedClubProfile(req);
    if (!profile)
      return res.status(403).json({ error: "La verificación está disponible para perfiles de clubes." });
    const progress = await syncClubVerification(profile.id);
    if (progress.verification !== "VERIFIED")
      return res.status(400).json({
        error: `Subí al menos una foto por instalación. Completaste ${progress.photographed} de ${progress.total}.`,
      });
    res.json({ profile: await accountProfile(profile.id), progress });
  } catch (error) {
    next(error);
  }
});

app.post("/api/me/facilities", auth, async (req, res, next) => {
  try {
    const profile = ownedClubProfile(req);
    if (!profile)
      return res.status(403).json({ error: "Esta acción está disponible para perfiles de clubes." });
    const name = cleanText(req.body.name, 120);
    if (!name) throw validationError("Escribí el nombre de la instalación.");
    const count = await prisma.clubFacility.count({ where: { profileId: profile.id } });
    if (count >= 12) throw validationError("Podés declarar hasta 12 instalaciones.");
    await prisma.$transaction(async (tx) => {
      await tx.clubFacility.create({ data: { profileId: profile.id, name, sortOrder: count } });
      await syncClubVerification(profile.id, tx);
    });
    await audit(req.user.id, "CLUB_FACILITY_CREATED", profile.id, { name });
    res.status(201).json({ profile: await accountProfile(profile.id) });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/me/facilities/:id", auth, async (req, res, next) => {
  try {
    const profile = ownedClubProfile(req);
    if (!profile)
      return res.status(403).json({ error: "Esta acción está disponible para perfiles de clubes." });
    const facility = await prisma.clubFacility.findFirst({ where: { id: req.params.id, profileId: profile.id } });
    if (!facility) return res.status(404).json({ error: "Instalación no encontrada." });
    const name = cleanText(req.body.name, 120);
    if (!name) throw validationError("Escribí el nombre de la instalación.");
    await prisma.clubFacility.update({ where: { id: facility.id }, data: { name } });
    await audit(req.user.id, "CLUB_FACILITY_RENAMED", profile.id, { facilityId: facility.id, name });
    res.json({ profile: await accountProfile(profile.id) });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/me/facilities/:id", auth, async (req, res, next) => {
  try {
    const profile = ownedClubProfile(req);
    if (!profile)
      return res.status(403).json({ error: "Esta acción está disponible para perfiles de clubes." });
    const facilities = await prisma.clubFacility.findMany({
      where: { profileId: profile.id },
      include: { photos: true },
    });
    const facility = facilities.find((item) => item.id === req.params.id);
    if (!facility) return res.status(404).json({ error: "Instalación no encontrada." });
    if (facilities.length <= 1) throw validationError("El club debe conservar al menos una instalación declarada.");
    await prisma.$transaction(async (tx) => {
      await tx.clubFacility.delete({ where: { id: facility.id } });
      await syncClubVerification(profile.id, tx);
    });
    await Promise.all(facility.photos.map((photo) => fs.promises.unlink(path.join(uploadDir, path.basename(photo.url))).catch(() => {})));
    await audit(req.user.id, "CLUB_FACILITY_DELETED", profile.id, { facilityId: facility.id, name: facility.name });
    res.json({ profile: await accountProfile(profile.id) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/me/facilities/:id/photos", claimLimiter, auth, facilityPhotoUpload.single("photo"), async (req, res, next) => {
  try {
    const profile = ownedClubProfile(req);
    const facility = profile
      ? await prisma.clubFacility.findFirst({ where: { id: req.params.id, profileId: profile.id }, include: { _count: { select: { photos: true } } } })
      : null;
    if (!facility) {
      if (req.file) await fs.promises.unlink(req.file.path).catch(() => {});
      return res.status(404).json({ error: "Instalación no encontrada." });
    }
    if (!req.file) throw validationError("Elegí una foto para subir.");
    if (facility._count.photos >= 6) {
      await fs.promises.unlink(req.file.path).catch(() => {});
      throw validationError("Podés subir hasta 6 fotos por instalación.");
    }
    const url = `/uploads/${req.file.filename}`;
    try {
      await prisma.$transaction(async (tx) => {
        await tx.facilityPhoto.create({ data: { facilityId: facility.id, url } });
        await syncClubVerification(profile.id, tx);
      });
    } catch (error) {
      await fs.promises.unlink(req.file.path).catch(() => {});
      throw error;
    }
    await audit(req.user.id, "CLUB_FACILITY_PHOTO_ADDED", profile.id, { facilityId: facility.id });
    res.status(201).json({ profile: await accountProfile(profile.id) });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/me/facility-photos/:id", auth, async (req, res, next) => {
  try {
    const profile = ownedClubProfile(req);
    const photo = profile
      ? await prisma.facilityPhoto.findFirst({
          where: { id: req.params.id, facility: { profileId: profile.id } },
          include: { facility: true },
        })
      : null;
    if (!photo) return res.status(404).json({ error: "Foto no encontrada." });
    await prisma.$transaction(async (tx) => {
      await tx.facilityPhoto.delete({ where: { id: photo.id } });
      await syncClubVerification(profile.id, tx);
    });
    await fs.promises.unlink(path.join(uploadDir, path.basename(photo.url))).catch(() => {});
    await audit(req.user.id, "CLUB_FACILITY_PHOTO_DELETED", profile.id, { facilityId: photo.facilityId });
    res.json({ profile: await accountProfile(profile.id) });
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
      Number.isFinite(lng) &&
      Math.abs(lat) <= 90 &&
      Math.abs(lng) <= 180;
    const requestedRadius = Number(req.query.radius);
    const radiusKm = hasCoordinates
      ? req.query.radius !== undefined && Number.isFinite(requestedRadius)
        ? Math.min(100, Math.max(1, requestedRadius))
        : 5
      : null;
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
    })).filter((profile) => !hasCoordinates ||
      (profile.latitude !== null && profile.longitude !== null &&
        distanceKm(lat, lng, profile.latitude, profile.longitude) <= radiusKm));
    const priority = { CLUB: 0, PROFESSIONAL: 1, FEDERATION: 2, SPONSOR: 3 };
    result.sort((a, b) => {
      if (hasCoordinates)
        return (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity);
      if (a.isDemo !== b.isDemo) return Number(a.isDemo) - Number(b.isDemo);
      if (a.verification !== b.verification && (a.verification === "VERIFIED" || b.verification === "VERIFIED"))
        return a.verification === "VERIFIED" ? -1 : 1;
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
      include: {
        profilePhotos: { orderBy: { createdAt: "asc" } },
        facilities: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          include: { photos: { orderBy: { createdAt: "asc" } } },
        },
      },
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
    const [users, profiles, categories, claims, verificationRequests] = await Promise.all([
      prisma.user.count(),
      prisma.profile.findMany({ orderBy: { createdAt: "desc" }, take: 1000, include: { user: { select: { email: true } }, claimedBy: { select: { email: true } } } }),
      prisma.profile.groupBy({ by: ["category"], _count: { id: true } }),
      prisma.claimRequest.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "asc" }, include: { user: { select: { email: true, profile: { select: { name: true } } } }, profile: { select: { name: true, sourceUrl: true } } } }),
      prisma.clubVerificationRequest.findMany({
        where: { status: "PENDING" },
        orderBy: { createdAt: "asc" },
        include: { profile: { include: { user: { select: { email: true } }, claimedBy: { select: { email: true } } } } },
      }),
    ]);
    res.json({
      users,
      profiles: profiles.map((profile) => ({ ...safeProfile(profile, true, true), accountEmail: profile.user?.email || profile.claimedBy?.email || null })),
      categories,
      claims: claims.map((claim) => ({ id: claim.id, profileId: claim.profileId, profileName: claim.profile.name, applicant: claim.user.email, applicantName: claim.user.profile?.name, evidence: claim.evidence, createdAt: claim.createdAt })),
      verificationRequests: verificationRequests.map((request) => ({
        id: request.id,
        profileId: request.profileId,
        profileName: request.profile.name,
        applicant: request.profile.user?.email || request.profile.claimedBy?.email || null,
        createdAt: request.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
});

async function prepareProfileImport(buffer, filename) {
  const parsed = await parseImportFile(buffer, filename);
  const rows = parsed.map(validateImportRow);
  const seenIds = new Set();
  const seenProfiles = new Set();
  for (const row of rows) {
    if (row.id && seenIds.has(row.id.toLowerCase())) row.errors.push("id_externo repetido en el archivo");
    if (row.id) seenIds.add(row.id.toLowerCase());
    const identity = [row.category, row.name, row.data.city, row.data.address].map((value) => String(value || "").toLocaleLowerCase("es")).join("|");
    if (row.name && seenProfiles.has(identity)) row.errors.push("perfil repetido en el archivo");
    if (row.name) seenProfiles.add(identity);
  }
  const keys = rows.filter((row) => row.id).map((row) => row.data.sourceKey);
  const names = [...new Set(rows.filter((row) => row.name).map((row) => row.name))];
  const [byKey, byName] = await Promise.all([
    prisma.profile.findMany({ where: { sourceKey: { in: keys } }, select: { id: true, sourceKey: true, claimedById: true, verification: true } }),
    names.length
      ? prisma.profile.findMany({ where: { OR: names.map((name) => ({ name: { equals: name, mode: "insensitive" } })) }, select: { id: true, name: true, category: true, city: true, address: true, sourceKey: true } })
      : [],
  ]);
  const keyMap = new Map(byKey.map((profile) => [profile.sourceKey, profile]));
  for (const row of rows) {
    const existing = keyMap.get(row.data.sourceKey);
    const duplicate = row.data.address && byName.find((profile) => profile.id !== existing?.id
      && profile.category === row.category
      && profile.name.toLocaleLowerCase("es") === row.name?.toLocaleLowerCase("es")
      && profile.city.toLocaleLowerCase("es") === row.data.city?.toLocaleLowerCase("es")
      && (profile.address || "").toLocaleLowerCase("es") === (row.data.address || "").toLocaleLowerCase("es"));
    row.action = row.errors.length ? "error" : existing?.claimedById || existing?.verification === "VERIFIED" || existing?.verification === "CLAIM_PENDING"
      ? "skip" : duplicate ? "skip" : existing ? "update" : "create";
    row.message = row.action === "skip"
      ? existing ? "Ficha reclamada o en verificación: no se modifica." : "Ya existe una ficha con ese nombre, ciudad y dirección."
      : row.errors.join("; ");
  }
  return {
    rows,
    summary: {
      total: rows.length,
      create: rows.filter((row) => row.action === "create").length,
      update: rows.filter((row) => row.action === "update").length,
      skip: rows.filter((row) => row.action === "skip").length,
      error: rows.filter((row) => row.action === "error").length,
    },
  };
}

app.get("/api/admin/import/template/:format", auth, adminOnly, async (req, res, next) => {
  try {
    if (!["csv", "xlsx"].includes(req.params.format)) throw importError("Formato de plantilla inválido.");
    const format = req.params.format;
    const buffer = await buildImportTemplate(format);
    res.setHeader("Cache-Control", "no-store");
    res.type(format === "xlsx" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "text/csv; charset=utf-8");
    res.attachment(`iidca-plantilla-importador.${format}`);
    res.send(buffer);
  } catch (error) { next(error); }
});

const importBody = express.raw({ type: "application/octet-stream", limit: "5mb" });
app.post("/api/admin/import/:step", auth, adminOnly, importLimiter, importBody, async (req, res, next) => {
  try {
    if (!["preview", "commit"].includes(req.params.step)) throw importError("Operación de importación inválida.");
    const filename = cleanText(req.query.filename, 200);
    const prepared = await prepareProfileImport(req.body, filename);
    if (req.params.step === "preview") {
      return res.json({
        summary: prepared.summary,
        rows: prepared.rows.map(({ line, id, name, category, action, message }) => ({ line, id, name, category, action, message })),
      });
    }
    if (prepared.summary.error) throw importError("Corregí las filas con errores y volvé a revisar el archivo antes de importar.");
    if (!prepared.summary.create && !prepared.summary.update) throw importError("No hay fichas nuevas o editables para importar.");
    await prisma.$transaction(async (tx) => {
      for (const row of prepared.rows) {
        if (row.action === "create") await tx.profile.create({ data: row.data });
        if (row.action === "update") await tx.profile.update({ where: { sourceKey: row.data.sourceKey }, data: { ...row.data, verification: undefined } });
      }
      await tx.auditEvent.create({ data: {
        actorId: req.user.id,
        action: "PROFILE_BULK_IMPORT",
        detail: { filename, ...prepared.summary },
      } });
    }, { timeout: 60000 });
    res.json({ summary: prepared.summary });
  } catch (error) { next(error); }
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
        ? { verification: "UNVERIFIED", claimedById: claim.userId, status: "PUBLISHED" }
        : { verification: "UNVERIFIED" } });
      if (decision === "APPROVED" && claim.user.profile)
        await tx.profile.update({ where: { id: claim.user.profile.id }, data: { status: "HIDDEN" } });
    });
    await audit(req.user.id, `CLAIM_${decision}`, claim.profileId, { claimId: claim.id, applicant: claim.user.email });
    res.json({ ok: true });
  } catch (error) { next(error); }
});

app.patch("/api/admin/verification-requests/:id", auth, adminOnly, async (req, res, next) => {
  try {
    const decision = cleanText(req.body.decision, 10);
    if (!["APPROVED", "REJECTED"].includes(decision)) throw validationError("Decisión inválida.");
    const request = await prisma.clubVerificationRequest.findUnique({
      where: { id: req.params.id },
      include: { profile: true },
    });
    if (!request || request.status !== "PENDING")
      return res.status(404).json({ error: "Solicitud de verificación pendiente no encontrada." });
    await prisma.$transaction(async (tx) => {
      await tx.clubVerificationRequest.update({
        where: { id: request.id },
        data: { status: decision, reviewedAt: new Date() },
      });
      if (decision === "APPROVED") {
        const progress = await syncClubVerification(request.profileId, tx);
        if (progress.verification !== "VERIFIED")
          throw validationError("El club necesita una foto por cada instalación declarada antes de recibir la insignia.");
      } else {
        await tx.profile.update({ where: { id: request.profileId }, data: { verification: "UNVERIFIED" } });
      }
    });
    await audit(req.user.id, `CLUB_VERIFICATION_${decision}`, request.profileId, { requestId: request.id });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
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

const distPath = path.resolve(dirname, "../dist");
app.use("/api", (_req, res) =>
  res.status(404).json({ error: "Ruta no encontrada." }),
);
app.use(express.static(distPath));
app.get("/{*path}", (_req, res) =>
  res.sendFile(path.join(distPath, "index.html")),
);

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE")
    return res.status(413).json({ error: "La foto supera los 5 MB permitidos." });
  if (error instanceof multer.MulterError)
    return res.status(400).json({ error: "No pudimos procesar la foto." });
  if (error.status === 413)
    return res.status(413).json({ error: "El archivo supera los 5 MB permitidos." });
  if (error.status === 400)
    return res.status(400).json({ error: error.message });
  if (error.status === 404)
    return res.status(404).json({ error: "Archivo no encontrado." });
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
