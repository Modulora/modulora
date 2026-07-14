import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(webRoot, "../..");
const packageJson = JSON.parse(readFileSync(join(webRoot, "package.json"), "utf8"));
const page = readFileSync(join(webRoot, "content/docs/open-source-credits.mdx"), "utf8");
const licenseReport = JSON.parse(
  execFileSync(
    "pnpm",
    ["--filter", "web", "licenses", "list", "--prod", "--json"],
    { cwd: repoRoot, encoding: "utf8" },
  ),
);

const installedLicenses = new Map();
for (const [license, packages] of Object.entries(licenseReport)) {
  for (const entry of packages) {
    if (!installedLicenses.has(entry.name)) installedLicenses.set(entry.name, new Set());
    installedLicenses.get(entry.name).add(license);
  }
}

for (const [name, range] of Object.entries(packageJson.dependencies)) {
  if (!range.startsWith("workspace:")) continue;
  const workspaceManifest = JSON.parse(
    readFileSync(join(repoRoot, "packages", name.split("/").at(-1), "package.json"), "utf8"),
  );
  installedLicenses.set(name, new Set([workspaceManifest.license]));
}

const documented = new Map();
for (const line of page.split("\n")) {
  if (!line.startsWith("| [")) continue;
  const columns = line.split("|").map((column) => column.trim());
  const packageMatch = columns[1]?.match(/\(`([^`]+)`\)$/);
  const linkMatch = columns[1]?.match(/^\[[^\]]+\]\((https:\/\/[^)]+)\)/);
  if (!packageMatch) continue;
  if (!linkMatch) throw new Error(`${packageMatch[1]} must use an HTTPS project link.`);
  documented.set(packageMatch[1], columns[2]);
}

const normalize = (value) => value.toLowerCase().replaceAll(/\s+/g, " ").trim();
const direct = Object.keys(packageJson.dependencies);
const errors = [];

for (const name of direct) {
  const displayed = documented.get(name);
  if (!displayed) {
    errors.push(`Missing direct production dependency: ${name}`);
    continue;
  }
  const licenses = installedLicenses.get(name);
  if (!licenses?.size) {
    errors.push(`No installed license metadata found for: ${name}`);
    continue;
  }
  const expected = [...licenses].sort().join(" OR ");
  if (normalize(displayed) !== normalize(expected)) {
    errors.push(`${name}: docs say "${displayed}"; installed manifest says "${expected}"`);
  }
}

for (const name of documented.keys()) {
  if (!direct.includes(name)) errors.push(`Documented package is not a direct dependency: ${name}`);
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`Open-source credits verified: ${direct.length} direct production dependencies.`);
