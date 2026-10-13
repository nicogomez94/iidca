import "dotenv/config";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const passwordHash = await bcrypt.hash(
  crypto.randomBytes(32).toString("hex"),
  12,
);
const examples = [
  {
    email: "club-horizonte@example.test",
    role: "CLUB",
    name: "Club Horizonte",
    headline: "Un club de barrio para moverse en comunidad",
    description:
      "Actividades para empezar, seguir y compartir. Un espacio abierto a quienes quieren que el deporte sea parte de su semana.",
    sports: ["Fútbol", "Vóley", "Yoga"],
    sport: "Fútbol",
    city: "Ciudad de Buenos Aires",
    neighborhood: "Palermo",
    address: "Palermo, Ciudad de Buenos Aires",
    latitude: -34.5835,
    longitude: -58.4305,
    category: "CLUB",
    status: "PUBLISHED",
    isDemo: true,
    details: {
      levels: "Inicial y recreativo",
      schedule: "Lunes a sábados",
      facilities: "Canchas y salón multiuso",
    },
  },
  {
    email: "club-del-parque@example.test",
    role: "CLUB",
    name: "Club del Parque",
    headline: "Deporte cerca de casa, para todas las trayectorias",
    description:
      "Un punto de encuentro barrial con propuestas para quienes recién empiezan y quienes buscan entrenar en equipo.",
    sports: ["Básquet", "Hockey", "Fútbol"],
    sport: "Básquet",
    city: "Ciudad de Buenos Aires",
    neighborhood: "Caballito",
    address: "Caballito, Ciudad de Buenos Aires",
    latitude: -34.6166,
    longitude: -58.4433,
    category: "CLUB",
    status: "PUBLISHED",
    isDemo: true,
    details: {
      levels: "Inicial, recreativo y competitivo",
      schedule: "Lunes a viernes",
      facilities: "Gimnasio y cancha",
    },
  },
  {
    email: "movimiento-sur@example.test",
    role: "PROFESSIONAL",
    name: "Movimiento Sur",
    headline: "Entrenamiento para empezar a tu ritmo",
    description:
      "Acompañamiento de actividad física orientado a crear hábitos sostenibles y encontrar una práctica que disfrutes.",
    sports: ["Entrenamiento funcional", "Running"],
    sport: "Entrenamiento funcional",
    city: "Ciudad de Buenos Aires",
    neighborhood: "San Telmo",
    address: "San Telmo, Ciudad de Buenos Aires",
    latitude: -34.6211,
    longitude: -58.3737,
    category: "PROFESSIONAL",
    status: "PUBLISHED",
    isDemo: true,
    details: {
      profession: "Profesorado de Educación Física",
      mode: "Presencial y online",
      audience: "Personas que quieren comenzar",
    },
  },
  {
    email: "red-natacion@example.test",
    role: "FEDERATION",
    name: "Red Acuática Metropolitana",
    headline: "Más personas cerca del agua y del deporte",
    description:
      "Organización deportiva de ejemplo dedicada a visibilizar espacios de natación y acompañar a clubes afiliados.",
    sports: ["Natación"],
    sport: "Natación",
    city: "Ciudad de Buenos Aires",
    neighborhood: "Belgrano",
    address: "Belgrano, Ciudad de Buenos Aires",
    latitude: -34.5606,
    longitude: -58.4564,
    category: "FEDERATION",
    status: "PUBLISHED",
    isDemo: true,
    details: {
      region: "Ciudad de Buenos Aires",
      socialPractice: "Sí",
      beginners: "Sí",
    },
  },
  {
    email: "espacio-norte@example.test",
    role: "CLUB",
    name: "Espacio Norte",
    headline: "Probá una actividad nueva en tu barrio",
    description:
      "Clases recreativas y grupos para crear rutina, ganar confianza y conocer gente a través del movimiento.",
    sports: ["Yoga", "Pilates", "Running"],
    sport: "Yoga",
    city: "Ciudad de Buenos Aires",
    neighborhood: "Núñez",
    address: "Núñez, Ciudad de Buenos Aires",
    latitude: -34.5418,
    longitude: -58.4658,
    category: "CLUB",
    status: "PUBLISHED",
    isDemo: true,
    details: {
      levels: "Inicial y recreativo",
      schedule: "Lunes a sábados",
      facilities: "Sala y patio",
    },
  },
  {
    email: "alianza-deportiva@example.test",
    role: "SPONSOR",
    name: "Alianza Deportiva",
    headline: "Marcas que acompañan al deporte comunitario",
    description:
      "Ejemplo de organización interesada en apoyar proyectos deportivos de impacto local.",
    sports: ["Deporte comunitario"],
    sport: "Deporte comunitario",
    city: "Ciudad de Buenos Aires",
    neighborhood: "Recoleta",
    address: "Recoleta, Ciudad de Buenos Aires",
    latitude: -34.5877,
    longitude: -58.3925,
    category: "SPONSOR",
    status: "PUBLISHED",
    isDemo: true,
    details: { sector: "Bienestar", support: "Clubes y causas deportivas" },
  },
];

for (const { email, role, ...profile } of examples) {
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, role, passwordHash, profile: { create: profile } },
  });
}

console.log(
  `${examples.length} perfiles de ejemplo listos. Son ficticios y están marcados como demostración.`,
);
await prisma.$disconnect();
