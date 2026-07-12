/**
 * Canonical content digest for a component release. The digest is computed from
 * the exact files we store and serve, so a consumer (or the Modulora CLI) can
 * verify that what they install byte-for-byte matches what was published and
 * shown here. This is the core supply-chain-integrity primitive: install
 * delivers these files and nothing else, and the CLI never runs install scripts.
 */
import type { PublishFile } from "./publish";

/** Normalize line endings so the digest is stable across platforms. */
function normalize(content: string): string {
  return content.replace(/\r\n/g, "\n");
}

/**
 * SHA-256 over the sorted (path, content) pairs. Sorting makes the digest
 * independent of file order; the length-prefixed encoding prevents ambiguity
 * between path and content boundaries.
 */
export async function contentDigest(files: PublishFile[]): Promise<string> {
  const parts = [...files]
    .map((file) => ({ path: file.path.trim(), content: normalize(file.content) }))
    .sort((a, b) => a.path.localeCompare(b.path))
    .map((file) => `${file.path.length}:${file.path}\n${file.content.length}:${file.content}`);
  const encoded = new TextEncoder().encode(parts.join("\n\u0000\n"));
  const hash = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
