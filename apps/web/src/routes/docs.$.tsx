/**
 * Docs — fumadocs-core headless pipeline (MDX collections, page tree, TOC)
 * with fully custom Modulora UI (components/docs-ui.tsx). No fumadocs-ui.
 */
import { Suspense } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useFumadocsLoader } from "fumadocs-core/source/client";
import browserCollections from "collections/browser";
import { docsSource } from "@/lib/docs-source";
import { DocsArticle, DocsShell } from "@/components/docs-ui";
import { MarketplaceCalculator, SplitDonut } from "@/components/money";

export const Route = createFileRoute("/docs/$")({
  loader: async ({ params }) => {
    const slugs = params._splat?.split("/").filter(Boolean) ?? [];
    const data = await serverLoader({ data: slugs });
    await clientLoader.preload(data.path);
    return data;
  },
  component: DocsPage,
});

const serverLoader = createServerFn({ method: "GET" })
  .validator((slugs: string[]) => slugs.map((s) => String(s)))
  .handler(async ({ data: slugs }) => {
    const page = docsSource.getPage(slugs);
    if (!page) throw notFound();
    return {
      path: page.path,
      url: page.url,
      pageTree: await docsSource.serializePageTree(docsSource.getPageTree()),
    };
  });

interface ArticleProps {
  tree: import("fumadocs-core/page-tree").Root;
  url: string;
  renderLink: (url: string, active: boolean, children: React.ReactNode) => React.ReactNode;
}

const clientLoader = browserCollections.docs.createClientLoader({
  component({ toc, frontmatter, default: MDX }, props: ArticleProps) {
    return (
      <DocsArticle
        title={frontmatter.title}
        description={frontmatter.description}
        toc={toc}
        tree={props.tree}
        url={props.url}
        renderLink={props.renderLink}
      >
        <MDX components={{ SplitDonut, MarketplaceCalculator }} />
      </DocsArticle>
    );
  },
});

function DocsPage() {
  const data = useFumadocsLoader(Route.useLoaderData());
  const sidebarLink = (url: string, active: boolean, children: React.ReactNode) => (
    <Link
      to={url}
      className={`flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors ${
        active ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
      }`}
    >
      {children}
    </Link>
  );
  const plainLink = (url: string, _active: boolean, children: React.ReactNode) => (
    <Link to={url} className="block h-full">
      {children}
    </Link>
  );
  return (
    <DocsShell tree={data.pageTree} activeUrl={data.url} renderLink={sidebarLink}>
      <Suspense>
        {clientLoader.useContent(data.path, { tree: data.pageTree, url: data.url, renderLink: plainLink })}
      </Suspense>
    </DocsShell>
  );
}
