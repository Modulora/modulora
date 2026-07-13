import type { LegalSection } from "@/lib/legal";

/** Shared layout for the Privacy Policy / Terms pages. */
export function LegalPage({
  title,
  version,
  intro,
  sections,
}: {
  title: string;
  version: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-14">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Version {version}. {intro}
      </p>

      <div className="mt-10 flex flex-col gap-8">
        {sections.map((section, i) => (
          <section key={section.title}>
            <h2 className="text-lg font-semibold">
              <span className="mr-2 tabular-nums text-muted-foreground/50">{i + 1}.</span>
              {section.title}
            </h2>
            <ul className="mt-3 flex flex-col gap-2">
              {section.body.map((point) => (
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
