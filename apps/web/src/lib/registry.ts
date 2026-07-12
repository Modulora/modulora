/**
 * Serve a published component as a shadcn registry-item JSON so
 * `shadcn add https://modulora.dev/r/@user/name[@version]` resolves.
 *
 * Only approved, public, open-source components are served. Files are the
 * installable (component-role) files with the `src/` prefix stripped and a
 * shadcn file `type` inferred from the path; npm dependencies come from the
 * author's package.json.
 */
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { and, eq } from "drizzle-orm";
import { schema } from "@modulora/db";

export interface ParsedRegistryPath {
  namespace: string;
  name: string;
  version: string | null;
}

/** Parse `@namespace/name` or `@namespace/name@version` (leading @ optional). */
export function parseRegistryPath(splat: string): ParsedRegistryPath | null {
  const clean = decodeURIComponent(splat).trim().replace(/^@/, "").replace(/\.json$/, "");
  const slash = clean.indexOf("/");
  if (slash < 1) return null;
  const namespace = clean.slice(0, slash).toLowerCase();
  let rest = clean.slice(slash + 1);
  let version: string | null = null;
  const at = rest.lastIndexOf("@");
  if (at > 0) {
    version = rest.slice(at + 1);
    rest = rest.slice(0, at);
  }
  const name = rest.toLowerCase();
  if (!namespace || !name) return null;
  return { namespace, name, version };
}

function fileType(path: string): string {
  if (/(^|\/)components\/ui\//.test(path)) return "registry:ui";
  if (/(^|\/)hooks?\//.test(path)) return "registry:hook";
  if (/(^|\/)lib\//.test(path)) return "registry:lib";
  return "registry:component";
}

interface RegistryItem {
  $schema: string;
  name: string;
  type: string;
  title?: string;
  description?: string;
  dependencies?: string[];
  files: { path: string; content: string; type: string }[];
}

export async function resolveRegistryItem(
  parsed: ParsedRegistryPath,
): Promise<RegistryItem | null> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return null;
  const db = drizzle(neon(databaseUrl), { schema });

  const [row] = await db
    .select({ component: schema.components, version: schema.componentVersions, namespace: schema.namespaces.name })
    .from(schema.components)
    .innerJoin(schema.namespaces, eq(schema.namespaces.id, schema.components.namespaceId))
    .leftJoin(schema.componentVersions, eq(schema.componentVersions.id, schema.components.latestVersionId))
    .where(and(eq(schema.namespaces.name, parsed.namespace), eq(schema.components.name, parsed.name)))
    .limit(1);

  if (!row) return null;
  const c = row.component;
  // Only serve components that are public, approved, and open-source.
  if (c.visibility !== "public" || c.reviewStatus !== "approved" || c.sourceModel !== "open-source") {
    return null;
  }

  // Resolve the requested version (or the latest).
  let versionId = row.version?.id ?? null;
  if (parsed.version) {
    const [v] = await db
      .select({ id: schema.componentVersions.id })
      .from(schema.componentVersions)
      .where(and(eq(schema.componentVersions.componentId, c.id), eq(schema.componentVersions.version, parsed.version)))
      .limit(1);
    versionId = v?.id ?? null;
  }
  if (!versionId) return null;

  const files = await db
    .select({ path: schema.componentFiles.path, content: schema.componentFiles.content, role: schema.componentFiles.role })
    .from(schema.componentFiles)
    .where(eq(schema.componentFiles.componentVersionId, versionId))
    .orderBy(schema.componentFiles.orderIndex);

  const installFiles = files.filter((f) => f.role === "component");
  if (installFiles.length === 0) return null;

  // npm dependencies from the author's package.json (excluding react runtime).
  let dependencies: string[] = [];
  const pkg = files.find((f) => f.path === "package.json");
  if (pkg?.content) {
    try {
      const parsedPkg = JSON.parse(pkg.content) as { dependencies?: Record<string, string> };
      dependencies = Object.keys(parsedPkg.dependencies ?? {}).filter(
        (dep) => dep !== "react" && dep !== "react-dom",
      );
    } catch {
      dependencies = [];
    }
  }

  return {
    $schema: "https://ui.shadcn.com/schema/registry-item.json",
    name: c.name,
    type: c.itemType || "registry:component",
    title: c.title,
    description: c.description,
    ...(dependencies.length ? { dependencies } : {}),
    files: installFiles.map((f) => {
      const path = f.path.replace(/^src\//, "");
      return { path, content: f.content ?? "", type: fileType(path) };
    }),
  };
}
