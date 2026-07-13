/**
 * Domain verification via a DNS TXT record. A creator proves control of a
 * domain by adding `_modulora.<domain> TXT modulora-verify=<token>`; we confirm
 * it with a DNS-over-HTTPS lookup. Verified domains back the "website verified"
 * profile indicator and gate paid purchase URLs to a domain the creator owns.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { and, desc, eq } from "drizzle-orm";
import { schema } from "@modulora/db";
import { getCurrentUser } from "./session";

const DOMAIN_RE = /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/;

function getDb() {
  const url = process.env.DATABASE_URL;
  return url ? drizzle(neon(url), { schema }) : null;
}

/** Normalize any input (URL or bare host) to a lowercase registrable domain. */
export function normalizeDomain(input: string): string | null {
  let host = input.trim().toLowerCase();
  try {
    if (host.includes("://")) host = new URL(host).hostname;
  } catch {
    /* fall through to bare parsing */
  }
  host = host.replace(/^www\./, "").replace(/\/.*$/, "").replace(/:.*/, "");
  if (!DOMAIN_RE.test(host) || host === "localhost") return null;
  return host;
}

export interface DomainRecord {
  domain: string;
  token: string;
  verified: boolean;
  txtName: string;
  txtValue: string;
  createdAt: string;
}

function toRecord(row: { domain: string; token: string; verifiedAt: Date | null; createdAt: Date }): DomainRecord {
  return {
    domain: row.domain,
    token: row.token,
    verified: row.verifiedAt !== null,
    txtName: `_modulora.${row.domain}`,
    txtValue: `modulora-verify=${row.token}`,
    createdAt: row.createdAt.toISOString(),
  };
}

export const listDomains = createServerFn({ method: "GET" }).handler(
  async (): Promise<DomainRecord[]> => {
    const request = getRequest();
    const user = request ? await getCurrentUser(request) : null;
    const db = getDb();
    if (!user || !db) return [];
    const rows = await db
      .select()
      .from(schema.verifiedDomains)
      .where(eq(schema.verifiedDomains.ownerUserId, user.id))
      .orderBy(desc(schema.verifiedDomains.createdAt));
    return rows.map(toRecord);
  },
);

export const addDomain = createServerFn({ method: "POST" })
  .validator((data: { domain: string }) => ({ domain: String(data.domain ?? "") }))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string; record?: DomainRecord }> => {
    const request = getRequest();
    const user = request ? await getCurrentUser(request) : null;
    if (!user) return { ok: false, error: "Sign in first." };
    const db = getDb();
    if (!db) return { ok: false, error: "Database is not configured." };

    const domain = normalizeDomain(data.domain);
    if (!domain) return { ok: false, error: "Enter a valid domain, e.g. yoursite.com." };

    const [existing] = await db
      .select()
      .from(schema.verifiedDomains)
      .where(and(eq(schema.verifiedDomains.ownerUserId, user.id), eq(schema.verifiedDomains.domain, domain)))
      .limit(1);
    if (existing) return { ok: true, record: toRecord(existing) };

    const token = crypto.randomUUID().replace(/-/g, "");
    const [created] = await db
      .insert(schema.verifiedDomains)
      .values({ ownerUserId: user.id, domain, token })
      .returning();
    return { ok: true, record: toRecord(created!) };
  });

export const removeDomain = createServerFn({ method: "POST" })
  .validator((data: { domain: string }) => ({ domain: String(data.domain ?? "") }))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const request = getRequest();
    const user = request ? await getCurrentUser(request) : null;
    const db = getDb();
    if (!user || !db) return { ok: false };
    await db
      .delete(schema.verifiedDomains)
      .where(and(eq(schema.verifiedDomains.ownerUserId, user.id), eq(schema.verifiedDomains.domain, normalizeDomain(data.domain) ?? data.domain)));
    return { ok: true };
  });

/** Confirm the TXT record via DNS-over-HTTPS and mark the domain verified. */
export const verifyDomain = createServerFn({ method: "POST" })
  .validator((data: { domain: string }) => ({ domain: String(data.domain ?? "") }))
  .handler(async ({ data }): Promise<{ ok: boolean; verified: boolean; error?: string }> => {
    const request = getRequest();
    const user = request ? await getCurrentUser(request) : null;
    if (!user) return { ok: false, verified: false, error: "Sign in first." };
    const db = getDb();
    if (!db) return { ok: false, verified: false, error: "Database is not configured." };

    const domain = normalizeDomain(data.domain);
    if (!domain) return { ok: false, verified: false, error: "Invalid domain." };

    const [row] = await db
      .select()
      .from(schema.verifiedDomains)
      .where(and(eq(schema.verifiedDomains.ownerUserId, user.id), eq(schema.verifiedDomains.domain, domain)))
      .limit(1);
    if (!row) return { ok: false, verified: false, error: "Add the domain first." };

    const expected = `modulora-verify=${row.token}`;
    let found = false;
    try {
      const res = await fetch(`https://cloudflare-dns.com/dns-query?name=_modulora.${domain}&type=TXT`, {
        headers: { accept: "application/dns-json" },
      });
      if (res.ok) {
        const dns = (await res.json()) as { Answer?: { data?: string }[] };
        found = (dns.Answer ?? []).some((a) => (a.data ?? "").replace(/^"|"$/g, "").includes(expected));
      }
    } catch {
      return { ok: false, verified: false, error: "DNS lookup failed — try again shortly." };
    }

    if (!found) {
      return { ok: true, verified: false, error: "TXT record not found yet. DNS can take a few minutes." };
    }

    await db
      .update(schema.verifiedDomains)
      .set({ verifiedAt: new Date() })
      .where(eq(schema.verifiedDomains.id, row.id));

    // Awaited: dangling promises are cancelled in the Workers runtime.
    const { emailDomainVerified } = await import("./email");
    await emailDomainVerified(user.email, row.domain);

    return { ok: true, verified: true };
  });
