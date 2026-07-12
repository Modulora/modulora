/**
 * Custom docs UI over the fumadocs-core headless pipeline — Modulora's own
 * sidebar, prose, and table of contents. No fumadocs-ui.
 */
import type { ReactNode } from "react";
import type * as PageTree from "fumadocs-core/page-tree";
import type { TOCItemType } from "fumadocs-core/toc";

export function DocsShell({
  tree,
  activeUrl,
  renderLink,
  children,
}: {
  tree: PageTree.Root;
  activeUrl: string;
  renderLink: (url: string, active: boolean, children: ReactNode) => ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-10 lg:grid-cols-[13rem_minmax(0,1fr)]">
      <aside className="hidden lg:block">
        <nav className="sticky top-20 flex flex-col gap-1">
          <p className="px-2 pb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground/60">Docs</p>
          <TreeNodes nodes={tree.children} activeUrl={activeUrl} renderLink={renderLink} />
        </nav>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function TreeNodes({
  nodes,
  activeUrl,
  renderLink,
}: {
  nodes: PageTree.Node[];
  activeUrl: string;
  renderLink: (url: string, active: boolean, children: ReactNode) => ReactNode;
}) {
  return (
    <>
      {nodes.map((node, i) => {
        if (node.type === "page") {
          return (
            <span key={node.url}>{renderLink(node.url, node.url === activeUrl, node.name)}</span>
          );
        }
        if (node.type === "folder") {
          return (
            <div key={i} className="mt-3 flex flex-col gap-1">
              <p className="px-2 pb-1 text-xs font-medium text-muted-foreground">{node.name}</p>
              <TreeNodes nodes={node.children} activeUrl={activeUrl} renderLink={renderLink} />
            </div>
          );
        }
        return <div key={i} className="my-2 h-px bg-border/60" />;
      })}
    </>
  );
}

export function DocsArticle({
  title,
  description,
  toc,
  children,
}: {
  title: string;
  description?: string;
  toc: TOCItemType[];
  children: ReactNode;
}) {
  const tocItems = toc.filter((item) => item.depth <= 3);
  return (
    <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_11rem]">
      <article className="min-w-0 max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {description ? <p className="mt-2 text-muted-foreground">{description}</p> : null}
        <div className="docs-prose mt-8">{children}</div>
      </article>
      {tocItems.length > 1 ? (
        <aside className="hidden xl:block">
          <nav className="sticky top-20">
            <p className="pb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground/60">On this page</p>
            <ul className="flex flex-col gap-1.5 border-l border-border/60">
              {tocItems.map((item) => (
                <li key={item.url}>
                  <a
                    href={item.url}
                    className={`block border-l -ml-px py-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground ${
                      item.depth <= 2 ? "border-transparent pl-3" : "border-transparent pl-6"
                    }`}
                  >
                    {item.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
      ) : null}
    </div>
  );
}
