import { createFileRoute, notFound, redirect, useNavigate } from "@tanstack/react-router";
import { HiPencil as Pencil } from "react-icons/hi2";

import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { ToolListingEditor } from "@/components/tool-listing-editor";
import { addDomain, discoverDomainConnect, verifyDomain } from "@/lib/domains";
import { fetchToolForEdit, previewToolListing, updateToolListing } from "@/lib/tool-listings";

export const Route = createFileRoute("/dashboard/tools/edit/$name")({
  beforeLoad: ({ context }) => { if (!context.user) throw redirect({ to: "/signin" }); },
  loader: async ({ params }) => {
    const listing = await fetchToolForEdit({ data: { name: params.name } });
    if (!listing) throw notFound();
    return listing;
  },
  component: EditToolListing,
});

function EditToolListing() {
  const initial = Route.useLoaderData();
  const navigate = useNavigate();
  return (
    <div className="w-full">
      <DashboardPageHeader title={`Edit ${initial.title}`} description="Submit changes for curator review. Your approved listing remains public until the edit is approved." icon={Pencil} className="mb-8" />
      <ToolListingEditor
        mode="edit"
        initial={initial}
        onInspect={async (siteUrl) => previewToolListing({ data: { siteUrl } })}
        onSubmit={async (input) => updateToolListing({ data: input })}
        onSubmitted={async () => navigate({ to: "/dashboard/components" })}
        onCreateDomain={async (domain) => addDomain({ data: { domain } })}
        onVerifyDomain={async (domain) => verifyDomain({ data: { domain } })}
        onDiscoverDomainConnect={async (domain) => discoverDomainConnect({ data: { domain } })}
      />
    </div>
  );
}
