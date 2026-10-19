import { Prisma, PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

export function isUniqueConstraintError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

// После `prisma generate` список полей меняется, а HMR Next оставляет старый
// PrismaClient на globalThis — тогда select по новым колонкам падает в runtime.
const SCHEMA_STAMP = Object.values(Prisma.RegistrationScalarFieldEnum).join(",");

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaSchemaStamp?: string;
};

function createClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

function getClient() {
  if (globalForPrisma.prisma && globalForPrisma.prismaSchemaStamp === SCHEMA_STAMP) {
    return globalForPrisma.prisma;
  }
  if (globalForPrisma.prisma) {
    void globalForPrisma.prisma.$disconnect();
  }
  const client = createClient();
  globalForPrisma.prisma = client;
  globalForPrisma.prismaSchemaStamp = SCHEMA_STAMP;
  return client;
}

export const prisma = getClient();
