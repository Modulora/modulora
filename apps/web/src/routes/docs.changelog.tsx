/**
 * CLI changelog (#47) — renders the Tegami-generated CHANGELOG.md from the
 * Modulora/cli repo inside the docs chrome. Fetched server-side with a
 * short cache; every release links back to the repo so the claims are
 * checkable at the source.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useFumadocsLoader } from "fumadocs-core/source/client";
import { createServerFn } from "@tanstack/react-start";
import { marked } from "marked";
import { docsSource } from "@/lib/docs-source";
import { DocsShell } from "@/components/docs-ui";

const CHANGELOG_URL = "https://raw.githubusercontent.com/Modulora/cli/main/CHANGELOG.md";

const fetchChangelog = createServerFn({ method: "GET" }).handler(async () => {
  let html: string | null = null;
  try {
    const res = await fetch(CHANGELOG_URL, {
      headers: { accept: "text/plain" },
      signal: AbortSignal.timeout(6000),
    });
    if (res.ok) {
      const markdown = await res.text();
      html = await marked.parse(markdown, { async: true });
    }
  } catch {
    // Unreachable upstream: render the fallback below, never a broken page.
  }
  return {
    html,
    pageTree: await docsSource.serializePageTree(docsSource.getPageTree()),
  };
});

export const Route = createFileRoute("/docs/changelog")({
  loader: () => fetchChangelog(),
  component: ChangelogPage,
});

function ChangelogPage() {
  const { html } = Route.useLoaderData();
  const data = useFumadocsLoader(Route.useLoaderData());
  return (
    <DocsShell
      tree={data.pageTree}
      activeUrl="/docs/changelog"
      renderLink={(url, active, children) => (
        <Link
          to={url}
          className={`flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors ${
            active ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
          }`}
        >
          {children}
        </Link>
      )}
    >
      <div className="min-w-0 max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight">CLI changelog</h1>
        <p className="mt-2 text-muted-foreground">
          Every release of the <code className="font-mono text-sm">modulora</code> CLI —{" "}
          <a
            href="https://github.com/Modulora/cli/blob/main/CHANGELOG.md"
            rel="noreferrer"
            className="text-foreground underline underline-offset-2"
          >
            verify at the source
          </a>
          .
        </p>
        {html ? (
          <div className="docs-prose mt-8" dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <p className="mt-8 rounded-xl border border-border/60 p-4 text-sm text-muted-foreground">
            Couldn&apos;t reach the changelog right now — read it on{" "}
            <a href="https://github.com/Modulora/cli/blob/main/CHANGELOG.md" rel="noreferrer" className="text-foreground underline underline-offset-2">GitHub</a>.
          </p>
        )}
      </div>
    </DocsShell>
  );
}
