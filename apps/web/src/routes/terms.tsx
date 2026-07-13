import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";
import { TERMS_OF_SERVICE, LEGAL_VERSION } from "@/lib/legal";

export const Route = createFileRoute("/terms")({ component: Terms });

function Terms() {
  return (
    <LegalPage
      title="Terms of Service"
      version={LEGAL_VERSION}
      intro="The agreement for using Modulora. Plain-language summary, not legal advice."
      sections={TERMS_OF_SERVICE}
    />
  );
}
