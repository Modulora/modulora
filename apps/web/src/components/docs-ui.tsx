/**
 * Custom docs UI over the fumadocs-core headless pipeline — Modulora's own
 * sidebar, prose, TOC, and prev/next navigation. No fumadocs-ui.
 *
 * Craft notes: the sidebar speaks the same language as the dashboard sidebar
 * (icon rows, uppercase section label, bg-accent active state) so the app
 * feels like one product; the TOC scroll-spies with a moving indicator; every
 * page ends with prev/next cards so reading has a direction.
 */
import { useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Banknote, BookOpen, Download, TerminalSquare, UploadCloud, type LucideIcon } from "lucide-react";
import type * as PageTree from "fumadocs-core/page-tree";
import { findNeighbour } from "fumadocs-core/page-tree";
import type { TOCItemType } from "fumadocs-core/toc";

/** Per-page icons, by route. Falls back to BookOpen. */
const PAGE_ICONS: Record<string, LucideIcon> = {
  "/docs": BookOpen,
  "/docs/installing": Download,
  "/docs/publishing": UploadCloud,
  "/docs/earning": Banknote,
  "/docs/cli": TerminalSquare,
};

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
    <div className="grid gap-10 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="hidden lg:block">
        <nav className="sticky top-20 flex flex-col gap-1 border-r border-border/40 pr-6">
          <p className="px-2 pb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground/60">
            Documentation
          </p>
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
          const Icon = PAGE_ICONS[node.url] ?? BookOpen;
          return (
            <span key={node.url}>
              {renderLink(
                node.url,
                node.url === activeUrl,
                <>
                  <Icon className="size-4 shrink-0 opacity-70" />
                  <span className="flex-1 truncate">{node.name}</span>
                </>,
              )}
            </span>
          );
        }
        if (node.type === "folder") {
          return (
            <div key={i} className="mt-4 flex flex-col gap-1">
              <p className="px-2 pb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground/60">{node.name}</p>
              <TreeNodes nodes={node.children} activeUrl={activeUrl} renderLink={renderLink} />
            </div>
          );
        }
        return <div key={i} className="my-2 h-px bg-border/60" />;
      })}
    </>
  );
}

/** Scroll-spy: which heading is currently in view. */
function useActiveHeading(toc: TOCItemType[]): string | null {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    const ids = toc.map((item) => item.url.replace(/^#/, ""));
    const headings = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Prefer the topmost visible heading; else keep the last one scrolled past.
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(`#${visible[0].target.id}`);
      },
      { rootMargin: "-80px 0px -70% 0px" },
    );
    for (const el of headings) observer.observe(el);
    return () => observer.disconnect();
  }, [toc]);
  return active;
}

export function DocsArticle({
  title,
  description,
  toc,
  tree,
  url,
  renderLink,
  children,
}: {
  title: string;
  description?: string;
  toc: TOCItemType[];
  tree: PageTree.Root;
  url: string;
  renderLink: (url: string, active: boolean, children: ReactNode) => ReactNode;
  children: ReactNode;
}) {
  const tocItems = toc.filter((item) => item.depth <= 3);
  const activeAnchor = useActiveHeading(tocItems);
  const neighbours = findNeighbour(tree, url);

  return (
    <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_12rem]">
      <div className="min-w-0 max-w-3xl">
        <article>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {description ? <p className="mt-2 text-muted-foreground">{description}</p> : null}
          <div className="docs-prose mt-8">{children}</div>
        </article>

        {/* Prev / next: reading has a direction. */}
        <nav className="mt-12 grid gap-3 border-t border-border/40 pt-6 sm:grid-cols-2">
          {neighbours.previous ? (
            renderLink(
              neighbours.previous.url,
              false,
              <span className="group flex h-full flex-col gap-1 rounded-xl border border-border/60 p-4 transition-colors hover:border-border hover:bg-card/40">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <ArrowLeft className="size-3 transition-transform group-hover:-translate-x-0.5" /> Previous
                </span>
                <span className="text-sm font-medium">{neighbours.previous.name}</span>
              </span>,
            )
          ) : (
            <span />
          )}
          {neighbours.next
            ? renderLink(
                neighbours.next.url,
                false,
                <span className="group flex h-full flex-col items-end gap-1 rounded-xl border border-border/60 p-4 text-right transition-colors hover:border-border hover:bg-card/40">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    Next <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                  </span>
                  <span className="text-sm font-medium">{neighbours.next.name}</span>
                </span>,
              )
            : null}
        </nav>
      </div>

      {tocItems.length > 1 ? (
        <aside className="hidden xl:block">
          <nav className="sticky top-20">
            <p className="pb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground/60">On this page</p>
            <ul className="flex flex-col border-l border-border/60">
              {tocItems.map((item) => {
                const active = item.url === activeAnchor;
                return (
                  <li key={item.url}>
                    <a
                      href={item.url}
                      className={`-ml-px block border-l py-1 text-xs transition-colors ${
                        item.depth <= 2 ? "pl-3.5" : "pl-6"
                      } ${
                        active
                          ? "border-foreground font-medium text-foreground"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {item.title}
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>
      ) : null}
    </div>
  );
}
