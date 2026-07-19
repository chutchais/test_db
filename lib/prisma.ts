import 'server-only'

import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

function extractSupabaseProjectRef(rawDirectUrl?: string): string | undefined {
  if (!rawDirectUrl) {
    return undefined
  }

  try {
    const directUrl = /^postgres(ql)?:\/\//i.test(rawDirectUrl)
      ? rawDirectUrl
      : `postgresql://${rawDirectUrl}`
    const parsed = new URL(directUrl)
    const match = parsed.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/i)
    return match?.[1]
  } catch {
    return undefined
  }
}

function normalizeDatabaseUrl(rawUrl: string, rawDirectUrl?: string): string {
  let connectionString = rawUrl.trim()

  // Handle copy/paste mistakes from provider UIs like: "Tenant/User postgres.xxx..."
  connectionString = connectionString.replace(/^tenant\/user[:\s]*/i, '')

  if (!/^postgres(ql)?:\/\//i.test(connectionString)) {
    connectionString = `postgresql://${connectionString}`
  }

  let parsed: URL
  try {
    parsed = new URL(connectionString)
  } catch {
    throw new Error(
      'DATABASE_URL is invalid. Expected format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE'
    )
  }

  if (!parsed.hostname || /\s/.test(parsed.hostname)) {
    throw new Error(
      `DATABASE_URL hostname is invalid ("${parsed.hostname || '<empty>'}"). Check your Supabase connection string.`
    )
  }

  // Supabase pooler requires usernames in `<db_user>.<project_ref>` format.
  // If missing, derive project_ref from DIRECT_URL when available.
  if (
    parsed.hostname.endsWith('.pooler.supabase.com') &&
    parsed.username &&
    !parsed.username.includes('.')
  ) {
    const projectRef = extractSupabaseProjectRef(rawDirectUrl)
    if (projectRef) {
      parsed.username = `${parsed.username}.${projectRef}`
      return parsed.toString()
    }
  }

  return parsed.toString()
}

const prismaClientSingleton = () => {
  const rawConnectionString = process.env.DATABASE_URL ?? process.env.DIRECT_URL
  const rawDirectUrl = process.env.DIRECT_URL

  if (!rawConnectionString) {
    throw new Error('DATABASE_URL (or DIRECT_URL) is not configured')
  }

  const connectionString = normalizeDatabaseUrl(rawConnectionString, rawDirectUrl)
  const adapter = new PrismaPg({ connectionString })
  return new PrismaClient({ adapter })
}

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>
}

export const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma
