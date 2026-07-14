import { describe, expect, it } from "vitest";
import {
  compareFiles,
  fingerprint,
  isScaffoldingPath,
  normalizeSource,
  screenSubmission,
  SIMILARITY_CORPUS_LIMITATION,
  type CandidateInput,
} from "../src/lib/similarity-core";

const BUTTON = `import { cn } from "@/lib/utils";
export function Button({ className, variant = "default", size = "md", asChild = false, ...props }) {
  const classes = cn("inline-flex items-center justify-center rounded-md font-medium transition-colors", variantStyles[variant], sizeStyles[size], className);
  if (asChild) return <Slot className={classes} {...props} />;
  return <button className={classes} data-variant={variant} data-size={size} {...props} />;
}
const variantStyles = { default: "bg-primary text-primary-foreground hover:bg-primary/90", outline: "border border-input bg-background hover:bg-accent" };
const sizeStyles = { sm: "h-8 px-3 text-xs", md: "h-9 px-4 text-sm", lg: "h-10 px-6" };`;

const UNRELATED = `export function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}`;

function reformat(source: string): string {
  return `// stolen and reformatted\n${source.replace(/, /g, ",\n  ").replace(/; /g, ";\n")}\n/* extra trailing comment */`;
}

function corpusItem(overrides: Partial<CandidateInput> = {}): CandidateInput {
  return {
    componentId: "c1",
    componentVersionId: "v1",
    ref: "@other/button",
    ownerUserId: "owner-other",
    files: [{ path: "components/ui/button.tsx", content: BUTTON, sha256: "sha-button" }],
    ...overrides,
  };
}

describe("similarity core", () => {
  it("normalizes comments and whitespace away", () => {
    expect(normalizeSource("const a = 1; // note\n/* block */ const b = 2;")).toBe('const a = 1; const b = 2;');
  });

  it("flags scaffolding paths and never scores them decisively", () => {
    expect(isScaffoldingPath("src/lib/utils.ts")).toBe(true);
    expect(isScaffoldingPath("index.css")).toBe(true);
    expect(isScaffoldingPath("package.json")).toBe(true);
    expect(isScaffoldingPath("components/ui/button.tsx")).toBe(false);
  });

  it("blocks exact cross-owner copies (same digest)", () => {
    const result = screenSubmission(
      { ownerUserId: "owner-me", files: [{ path: "button.tsx", content: BUTTON, sha256: "sha-button" }] },
      [corpusItem()],
    );
    expect(result.status).toBe("blocked");
    expect(result.candidates[0]?.confidence).toBe("exact");
    expect(result.corpusLimitation).toBe(SIMILARITY_CORPUS_LIMITATION);
  });

  it("blocks renamed, reformatted, comment-padded copies", () => {
    const result = screenSubmission(
      { ownerUserId: "owner-me", files: [{ path: "totally-mine.tsx", content: reformat(BUTTON), sha256: "different" }] },
      [corpusItem()],
    );
    expect(result.status).toBe("blocked");
    expect(result.candidates[0]?.confidence).toBe("high");
    expect(result.candidates[0]?.matches[0]?.matchedRegions.length).toBeGreaterThan(0);
  });

  it("ignores matches against the submitter's own corpus entries", () => {
    const result = screenSubmission(
      { ownerUserId: "owner-other", files: [{ path: "button.tsx", content: BUTTON, sha256: "sha-button" }] },
      [corpusItem()],
    );
    expect(result.status).toBe("clear");
    expect(result.candidates).toHaveLength(0);
  });

  it("does not block on shared scaffolding alone", () => {
    const utils = 'import { clsx } from "clsx"; import { twMerge } from "tailwind-merge"; export function cn(...inputs) { return twMerge(clsx(inputs)); }';
    const result = screenSubmission(
      { ownerUserId: "owner-me", files: [{ path: "lib/utils.ts", content: utils, sha256: "sha-utils" }] },
      [corpusItem({ files: [{ path: "lib/utils.ts", content: utils, sha256: "sha-utils" }] })],
    );
    expect(result.status).toBe("clear");
    expect(result.candidates[0]?.confidence).toBeNull();
    expect(result.candidates[0]?.matches[0]?.scaffolding).toBe(true);
  });

  it("clears genuinely different components", () => {
    const result = screenSubmission(
      { ownerUserId: "owner-me", files: [{ path: "use-debounce.ts", content: UNRELATED, sha256: "sha-unrelated" }] },
      [corpusItem()],
    );
    expect(result.status).toBe("clear");
  });

  it("reports explainable line regions, not just a score", () => {
    const submitted = fingerprint(reformat(BUTTON));
    const candidate = fingerprint(BUTTON);
    const comparison = compareFiles(submitted, candidate);
    expect(comparison.score).toBeGreaterThan(0.5);
    for (const region of comparison.matchedRegions) {
      expect(region.startLine).toBeGreaterThan(0);
      expect(region.endLine).toBeGreaterThanOrEqual(region.startLine);
    }
  });
});
