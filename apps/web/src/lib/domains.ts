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

/* ── Domain Connect discovery (one-click DNS setup) ──────────────────
 * Real discovery per the Domain Connect spec: resolve the domain's
 * `_domainconnect` TXT record, fetch the provider's settings, then check
 * whether Modulora's template is onboarded with that DNS provider. The
 * one-click UI renders only when this returns supported=true — today that
 * is never, because our template isn't in the registry yet. No fake buttons.
 */
const DC_PROVIDER_ID = "modulora.dev";
const DC_SERVICE_ID = "domain-verification";

export interface DomainConnectInfo {
  supported: boolean;
  provider?: string;
  applyUrl?: string;
}

export const discoverDomainConnect = createServerFn({ method: "POST" })
  .inputValidator((data: { domain: string }) => data)
  .handler(async ({ data }): Promise<DomainConnectInfo> => {
    const request = getRequest();
    const user = request ? await getCurrentUser(request) : null;
    const db = getDb();
    if (!user || !db) return { supported: false };
    const domain = normalizeDomain(data.domain);
    if (!domain) return { supported: false };
    const [row] = await db
      .select()
      .from(schema.verifiedDomains)
      .where(and(eq(schema.verifiedDomains.ownerUserId, user.id), eq(schema.verifiedDomains.domain, domain)))
      .limit(1);
    if (!row) return { supported: false };

    try {
      // 1. Discovery: _domainconnect TXT → the DNS provider's settings host.
      const dns = await fetch(
        `https://dns.google/resolve?name=_domainconnect.${domain}&type=TXT`,
        { headers: { accept: "application/json" } },
      );
      const dnsJson = (await dns.json()) as { Answer?: { type?: number; data?: string }[] };
      // Answers can include the CNAME chain; the settings host is the TXT (type 16).
      const settingsHost = dnsJson.Answer?.find((a) => a.type === 16)
        ?.data?.replace(/"/g, "")
        .trim()
        .replace(/\.$/, "");
      if (!settingsHost) return { supported: false };

      // 2. Provider settings for this domain.
      const settingsRes = await fetch(`https://${settingsHost}/v2/${domain}/settings`);
      if (!settingsRes.ok) return { supported: false };
      const settings = (await settingsRes.json()) as {
        providerDisplayName?: string;
        providerName?: string;
        urlAPI?: string;
        urlSyncUX?: string;
      };
      const provider = settings.providerDisplayName ?? settings.providerName;
      if (!settings.urlAPI || !settings.urlSyncUX) return { supported: false, provider };

      // 3. Is Modulora's template onboarded with this provider?
      const template = await fetch(
        `${settings.urlAPI}/v2/domainTemplates/providers/${DC_PROVIDER_ID}/services/${DC_SERVICE_ID}`,
      );
      if (!template.ok) return { supported: false, provider };

      // 4. Synchronous-flow apply URL; the DNS provider shows the user every
      //    change for review before anything is written.
      const params = new URLSearchParams({ domain, code: row.token });
      const applyUrl = `${settings.urlSyncUX}/v2/domainTemplates/providers/${DC_PROVIDER_ID}/services/${DC_SERVICE_ID}/apply?${params}`;
      return { supported: true, provider, applyUrl };
    } catch {
      return { supported: false };
    }
  });
