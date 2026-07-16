/**
 * Interactive element picker for UI feedback. Highlights the hovered element
 * and resolves with a compact descriptor on click, or null on Escape.
 * Client-only; callers hide their own UI while picking.
 */

export interface PickedElement {
  /** Best-effort unique CSS path, capped for transport. */
  selector: string;
  /** Visible text snippet for humans triaging the report. */
  text: string;
  /** Viewport rect at pick time, e.g. "120×48 @ (312, 96)". */
  rect: string;
}

function cssPath(element: Element): string {
  const parts: string[] = [];
  let node: Element | null = element;
  while (node && node !== document.documentElement && parts.length < 8) {
    if (node.id) {
      parts.unshift(`#${CSS.escape(node.id)}`);
      break;
    }
    const tag = node.tagName.toLowerCase();
    const parent: Element | null = node.parentElement;
    if (!parent) {
      parts.unshift(tag);
      break;
    }
    const siblings = [...parent.children].filter((child) => child.tagName === node!.tagName);
    parts.unshift(siblings.length > 1 ? `${tag}:nth-of-type(${siblings.indexOf(node) + 1})` : tag);
    node = parent;
  }
  return parts.join(" > ").slice(0, 300);
}

export function describeElement(element: Element): PickedElement {
  const rect = element.getBoundingClientRect();
  return {
    selector: cssPath(element),
    text: (element.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 120),
    rect: `${Math.round(rect.width)}×${Math.round(rect.height)} @ (${Math.round(rect.x)}, ${Math.round(rect.y)})`,
  };
}

export function pickElement(): Promise<PickedElement | null> {
  return new Promise((resolve) => {
    const highlight = document.createElement("div");
    highlight.setAttribute("aria-hidden", "true");
    highlight.style.cssText =
      "position:fixed;z-index:2147483646;pointer-events:none;border:2px solid #f5a623;border-radius:4px;background:rgba(245,166,35,0.12);transition:all 60ms ease-out;display:none;";
    const hint = document.createElement("div");
    hint.setAttribute("role", "status");
    hint.textContent = "Click the element this feedback is about — Esc cancels";
    hint.style.cssText =
      "position:fixed;z-index:2147483647;left:50%;top:16px;transform:translateX(-50%);background:#111;color:#fafafa;font:500 13px/1.4 system-ui;padding:8px 14px;border-radius:999px;box-shadow:0 4px 16px rgba(0,0,0,0.35);pointer-events:none;";
    document.body.appendChild(highlight);
    document.body.appendChild(hint);
    document.documentElement.style.cursor = "crosshair";

    let current: Element | null = null;

    function targetAt(event: MouseEvent): Element | null {
      const element = document.elementFromPoint(event.clientX, event.clientY);
      if (!element || element === highlight || element === hint || element === document.documentElement || element === document.body) return null;
      return element;
    }

    function onMove(event: MouseEvent) {
      const element = targetAt(event);
      current = element;
      if (!element) {
        highlight.style.display = "none";
        return;
      }
      const rect = element.getBoundingClientRect();
      highlight.style.display = "block";
      highlight.style.left = `${rect.left}px`;
      highlight.style.top = `${rect.top}px`;
      highlight.style.width = `${rect.width}px`;
      highlight.style.height = `${rect.height}px`;
    }

    function finish(result: PickedElement | null) {
      window.removeEventListener("mousemove", onMove, true);
      window.removeEventListener("click", onClick, true);
      window.removeEventListener("keydown", onKey, true);
      highlight.remove();
      hint.remove();
      document.documentElement.style.cursor = "";
      resolve(result);
    }

    function onClick(event: MouseEvent) {
      event.preventDefault();
      event.stopPropagation();
      const element = targetAt(event) ?? current;
      finish(element ? describeElement(element) : null);
    }

    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      finish(null);
    }

    window.addEventListener("mousemove", onMove, true);
    window.addEventListener("click", onClick, true);
    window.addEventListener("keydown", onKey, true);
  });
}
