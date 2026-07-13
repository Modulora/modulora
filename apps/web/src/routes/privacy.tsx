import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";
import { PRIVACY_POLICY, LEGAL_VERSION } from "@/lib/legal";

export const Route = createFileRoute("/privacy")({ component: Privacy });

function Privacy() {
  return (
    <LegalPage
      title="Privacy Policy"
      version={LEGAL_VERSION}
      intro="How Modulora handles your data. Plain-language summary, not legal advice."
      sections={PRIVACY_POLICY}
    />
  );
}
