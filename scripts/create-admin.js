import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
if (!email || !password || password.length < 12) {
  console.error(
    "Definí ADMIN_EMAIL y ADMIN_PASSWORD (mínimo 12 caracteres) en .env antes de ejecutar npm run admin:create.",
  );
  process.exit(1);
}

const prisma = new PrismaClient();
await prisma.user.upsert({
  where: { email: email.toLowerCase() },
  update: { passwordHash: await bcrypt.hash(password, 12), role: "ADMIN" },
  create: {
    email: email.toLowerCase(),
    passwordHash: await bcrypt.hash(password, 12),
    role: "ADMIN",
  },
});
console.log(`Administrador listo: ${email.toLowerCase()}`);
await prisma.$disconnect();
