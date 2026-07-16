/**
 * Preview builds for paid source. Unentitled viewers can render a live
 * preview, but they receive a compiled artifact — types and comments are
 * destroyed and local identifiers mangled server-side. This is lossy
 * compilation, not keyed encryption: Modulora being open source does not
 * weaken it, exactly as reading a minifier's source cannot un-minify its
 * output. The readable source never leaves the server without entitlement,
 * and any transform failure fails closed (no files at all).
 */
import { transform } from "sucrase";
import { minify } from "terser";

export interface PreviewFile {
  path: string;
  content: string;
}

/** Paid external source and unentitled hosted source are preview-only. */
export function requiresCompiledPreview(sourceModel: string, entitled: boolean): boolean {
  return sourceModel !== "open-source" || !entitled;
}

const BANNER = "/* Modulora preview build — purchase unlocks the readable source. */\n";
const SCRIPT_EXTENSIONS = /\.(tsx|ts|jsx|js|mjs)$/i;

async function compileOne(file: PreviewFile): Promise<PreviewFile> {
  if (!SCRIPT_EXTENSIONS.test(file.path)) return file;
  const stripped = transform(file.content, {
    transforms: ["typescript", "jsx"],
    jsxRuntime: "automatic",
    production: true,
    filePath: file.path,
  }).code;
  const minified = await minify(stripped, {
    module: true,
    compress: { defaults: true, passes: 2 },
    mangle: { toplevel: false },
    format: { comments: false },
  });
  if (!minified.code) throw new Error(`empty terser output for ${file.path}`);
  return { path: file.path, content: `${BANNER}${minified.code}` };
}

/**
 * Compile every script file for an unentitled preview. Returns null when any
 * file cannot be compiled — callers must treat null as "ship nothing".
 */
export async function obfuscatePreviewFiles(files: PreviewFile[]): Promise<PreviewFile[] | null> {
  try {
    return await Promise.all(files.map(compileOne));
  } catch (error) {
    console.error("preview obfuscation failed; withholding files", error);
    return null;
  }
}
