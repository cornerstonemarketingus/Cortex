import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = global as unknown as {
  prisma?: PrismaClient
  prismaAdapter?: PrismaPg
}

const databaseUrl = process.env.DATABASE_URL?.trim()
const hasDatabaseUrl = Boolean(databaseUrl)

const adapter =
  hasDatabaseUrl
    ? (globalForPrisma.prismaAdapter || new PrismaPg({ connectionString: databaseUrl! }))
    : undefined

export const prisma =
  hasDatabaseUrl
    ? (globalForPrisma.prisma || new PrismaClient({ adapter }))
    : null

if (process.env.NODE_ENV !== 'production' && prisma && adapter) {
  globalForPrisma.prisma = prisma
  globalForPrisma.prismaAdapter = adapter
}
