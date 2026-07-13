/**
 * Integrate prompts for AI agents. A copyable instruction block a user pastes
 * into their coding agent to install + wire up a component correctly — the
 * verified CLI path first, shadcn fallback, and no made-up steps. Pure and
 * client-safe (used by routes and Storybook).
 */

export interface AgentPromptInput {
  namespace: string;
  name: string;
  title: string;
  description?: string;
  /** Paid component the user owns — the agent must authenticate first. */
  owned?: boolean;
  /** What the purchase license implies about committing the source publicly. */
  publicRepoPolicy?: "forbidden" | "unknown" | "allowed";
  registryOrigin?: string;
}

export function buildAgentPrompt(input: AgentPromptInput): string {
  const origin = input.registryOrigin ?? "https://modulora.dev";
  const ref = `@${input.namespace}/${input.name}`;
  const lines = [
    `Integrate the "${input.title}" component (${ref}) from Modulora into this project.`,
    "",
    ...(input.description ? [`What it is: ${input.description}`, ""] : []),
    "Install:",
    ...(input.owned
      ? [
          `1. This is a purchased component — authenticate first: \`npx modulora login\` (opens a browser approval).`,
          `2. Run: \`npx modulora add ${ref}\``,
        ]
      : [
          `1. Run: \`npx modulora add ${ref}\``,
          `   (or with shadcn: \`npx shadcn@latest add ${origin}/r/${ref}\`)`,
        ]),
    `${input.owned ? "3" : "2"}. The CLI verifies the published content digest before writing. If it reports a digest mismatch, stop and do not use --force.`,
    `${input.owned ? "4" : "3"}. Install any npm dependencies the CLI lists after installing.`,
    "",
    "Integrate:",
    `- The component lands under the project's components directory (e.g. src/components/ui/).`,
    `- Import it where it's needed and wire required props; follow the project's existing styling conventions and design tokens.`,
    `- Do not modify the installed file beyond what integration requires; keep upstream changes possible.`,
    ...(input.owned && input.publicRepoPolicy === "forbidden"
      ? [
          "",
          "LICENSE RESTRICTION — this is purchased source:",
          `- This component's license does NOT permit redistribution. It CANNOT be committed to any public remote repository (public GitHub/GitLab/Bitbucket, mirrors, or published packages).`,
          `- Before committing, confirm the repository is private. If this project is or will become open source, do not add this component's source to it — stop and tell the user.`,
        ]
      : input.owned && input.publicRepoPolicy !== "allowed"
        ? [
            "",
            "LICENSE NOTE — this is purchased source under the seller's custom terms:",
            `- Check the license before committing this component to any public repository; if the terms don't clearly allow it, keep it in private repositories only.`,
          ]
        : []),
  ];
  return lines.join("\n");
}
