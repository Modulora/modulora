import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { HiGlobeAlt as Globe } from "react-icons/hi2";
import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { ToolListingEditor } from "@/components/tool-listing-editor";
import { previewToolListing, submitToolListing } from "@/lib/tool-listings";
import { addDomain, discoverDomainConnect, verifyDomain } from "@/lib/domains";

export const Route = createFileRoute("/dashboard/tools/new")({
  beforeLoad: ({ context }) => { if (!context.user) throw redirect({ to: "/signin" }); },
  component: NewToolListing,
});

function NewToolListing() {
  const navigate = useNavigate();
  return <div className="w-full"><DashboardPageHeader title="List a tool or site" description="Submit an owner-authorized, verified-domain resource to the searchable catalog." icon={Globe} className="mb-8" /><ToolListingEditor onInspect={async (siteUrl) => previewToolListing({ data: { siteUrl } })} onSubmit={async (input) => submitToolListing({ data: input })} onSubmitted={async () => navigate({ to: "/dashboard/components" })} onCreateDomain={async (domain) => addDomain({ data: { domain } })} onVerifyDomain={async (domain) => verifyDomain({ data: { domain } })} onDiscoverDomainConnect={async (domain) => discoverDomainConnect({ data: { domain } })} /></div>;
}
