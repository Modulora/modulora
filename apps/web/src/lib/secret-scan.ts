/**
 * Minimal pattern-based secret scan run at publish time. This is a real but
 * limited check: it catches common credential shapes in the published files.
 * It cannot prove the absence of unknown or obfuscated secrets — that
 * limitation is surfaced on every evidence record it produces.
 */
import type { PublishFile } from "./publish";

export const SECRET_SCAN_TOOL = "modulora-secretscan-0.1";

const PATTERNS: { label: string; re: RegExp }[] = [
  { label: "AWS access key", re: /\bAKIA[0-9A-Z]{16}\b/ },
  { label: "Private key block", re: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/ },
  { label: "GitHub token", re: /\bghp_[A-Za-z0-9]{36}\b/ },
  { label: "GitHub fine-grained token", re: /\bgithub_pat_[A-Za-z0-9_]{22,}\b/ },
  { label: "Slack token", re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/ },
  { label: "Google API key", re: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { label: "Stripe secret key", re: /\bsk_live_[0-9A-Za-z]{24,}\b/ },
  { label: "OpenAI key", re: /\bsk-[A-Za-z0-9]{40,}\b/ },
  { label: "Generic assigned secret", re: /(?:secret|password|passwd|api[_-]?key|token)\s*[:=]\s*["'][^"'\s]{12,}["']/i },
];

export interface SecretScanResult {
  clean: boolean;
  findings: string[];
}

export function scanFilesForSecrets(files: PublishFile[]): SecretScanResult {
  const findings: string[] = [];
  for (const file of files) {
    for (const pattern of PATTERNS) {
      if (pattern.re.test(file.content)) {
        findings.push(`${pattern.label} in ${file.path}`);
      }
    }
  }
  return { clean: findings.length === 0, findings };
}
