/**
 * Install parity: a creator-supplied shadcn command should install the same
 * code they uploaded to Modulora. There are four honest outcomes:
 *
 *   trusted       command points at our own registry — we serve the files.
 *   verified      external registry URL fetched and matched the uploaded files.
 *   mismatch      external URL fetched but the code differs → block the publish.
 *   unverifiable  a namespace reference (e.g. `shadcn add @you/x`) with no URL —
 *                 legitimate, but we cannot fetch it, so we make no parity claim.
 *
 * This is a point-in-time check; ongoing re-verification and digest pinning are
 * tracked in Modulora/modulora #33.
 */
import type { PublishFile } from "./publish";

function normalize(content: string): string {
  return content.replace(/\r\n/g, "\n").replace(/[ \t]+$/gm, "").replace(/\n+$/g, "\n").trimEnd();
}

function firstUrl(command: string): string | null {
  const match = command.match(/https?:\/\/[^\s"'`]+/i);
  return match ? match[0] : null;
}

function isOwnRegistry(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === "modulora.dev" || host === "www.modulora.dev" || host === "localhost";
  } catch {
    return false;
  }
}

function extractFiles(json: unknown): string[] {
  if (!json || typeof json !== "object") return [];
  const files = (json as { files?: unknown }).files;
  if (!Array.isArray(files)) return [];
  return files
    .map((file) => (file && typeof file === "object" ? (file as { content?: unknown }).content : undefined))
    .filter((content): content is string => typeof content === "string");
}

export interface ParityResult {
  status: "trusted" | "verified" | "mismatch" | "unverifiable";
  error?: string;
  scope?: string;
}

export async function verifyShadcnParity(
  command: string,
  files: PublishFile[],
): Promise<ParityResult> {
  const url = firstUrl(command);

  // No URL — a namespace/registry reference the shadcn CLI resolves itself
  // (e.g. `shadcn add @you/code-block`). Legitimate, but not fetchable here.
  if (!url) return { status: "unverifiable" };

  if (isOwnRegistry(url)) {
    return { status: "trusted", scope: "Served from Modulora's registry." };
  }

  let payload: unknown;
  try {
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) return { status: "mismatch", error: `Could not fetch the shadcn registry URL (${res.status}).` };
    payload = await res.json();
  } catch {
    return { status: "mismatch", error: "Could not fetch or parse the shadcn registry URL." };
  }

  const remote = extractFiles(payload).map(normalize);
  if (remote.length === 0) {
    return { status: "mismatch", error: "The shadcn registry URL returned no files to verify." };
  }

  const counts = new Map<string, number>();
  for (const content of remote) counts.set(content, (counts.get(content) ?? 0) + 1);

  for (const file of files) {
    const normalized = normalize(file.content);
    const count = counts.get(normalized) ?? 0;
    if (count === 0) {
      return {
        status: "mismatch",
        error: `The shadcn command installs different code than "${file.path}". Point it at your Modulora registry, or serve matching files.`,
      };
    }
    counts.set(normalized, count - 1);
  }

  return { status: "verified", scope: "Install-command output matched the published files at publish time." };
}
