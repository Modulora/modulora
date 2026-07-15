/** Legacy payout URL — payout controls now live in the Earnings workspace. */
import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/payouts")({
  component: PayoutsRedirect,
});

function PayoutsRedirect() {
  useEffect(() => {
    window.location.replace(`/dashboard/earnings${window.location.search}#payouts`);
  }, []);

  return <p className="text-sm text-muted-foreground">Opening earnings and payouts…</p>;
}
