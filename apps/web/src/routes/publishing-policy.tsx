import { createFileRoute } from "@tanstack/react-router";
import { PUBLISHING_POLICY, POLICY_VERSION } from "@/lib/publishing-policy";

export const Route = createFileRoute("/publishing-policy")({ component: PublishingPolicy });

function PublishingPolicy() {
  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-14">
      <h1 className="text-3xl font-bold tracking-tight">Publishing policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The rules for publishing components on Modulora. Version {POLICY_VERSION}. Plain-language operating policy,
        not legal advice.
      </p>

      <div className="mt-10 flex flex-col gap-8">
        {PUBLISHING_POLICY.map((section, i) => (
          <section key={section.title}>
            <h2 className="text-lg font-semibold">
              <span className="mr-2 text-muted-foreground/50 tabular-nums">{i + 1}.</span>
              {section.title}
            </h2>
            <ul className="mt-3 flex flex-col gap-2">
              {section.points.map((point) => (
                <li key={point} className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground">
                  <span className="mt-2 size-1 shrink-0 rounded-full bg-muted-foreground/50" />
                  {point}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
