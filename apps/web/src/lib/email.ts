/**
 * Transactional email (#54) — one shared sender over Resend with templates
 * in code (reviewable, versioned; no dashboard template dependency).
 * Fire-and-forget: a failed email never breaks the action that triggered
 * it. No tracking pixels; links go to modulora.dev.
 */

const ORIGIN = "https://modulora.dev";

export interface EmailInput {
  to: string;
  subject: string;
  heading: string;
  /** Paragraphs, rendered in order. */
  body: string[];
  cta?: { label: string; url: string };
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function render({ heading, body, cta }: EmailInput): { html: string; text: string } {
  const paragraphs = body
    .map((line) => `<p style="margin:0 0 14px;font-size:14px;line-height:1.65;color:#3f3f46;">${escapeHtml(line)}</p>`)
    .join("");
  const button = cta
    ? `<a href="${cta.url}" style="display:inline-block;margin-top:6px;padding:10px 18px;border-radius:8px;background:#18181b;color:#fafafa;font-size:13px;font-weight:600;text-decoration:none;">${escapeHtml(cta.label)}</a>`
    : "";
  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:32px 20px;">
    <p style="margin:0 0 24px;font-size:13px;font-weight:700;letter-spacing:0.08em;color:#18181b;">MODULORA</p>
    <div style="background:#ffffff;border:1px solid #e4e4e7;border-radius:12px;padding:28px;">
      <h1 style="margin:0 0 16px;font-size:18px;line-height:1.4;color:#18181b;">${escapeHtml(heading)}</h1>
      ${paragraphs}
      ${button}
    </div>
    <p style="margin:20px 0 0;font-size:11px;line-height:1.6;color:#a1a1aa;">
      Sent by Modulora · <a href="${ORIGIN}" style="color:#a1a1aa;">modulora.dev</a>
    </p>
  </div>
</body></html>`;
  const text = [heading, "", ...body, ...(cta ? ["", `${cta.label}: ${cta.url}`] : [])].join("\n");
  return { html, text };
}

export async function sendEmail(input: EmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // Dev without a key: log instead of silently dropping, so flows are testable.
    console.log(`[email] would send: "${input.subject}" → ${input.to}`);
    return;
  }
  // Transactional sender — distinct from the waitlist's RESEND_FROM.
  const from = process.env.RESEND_TRANSACTIONAL_FROM ?? "Modulora <noreply@mail.modulora.dev>";
  const { html, text } = render(input);
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: input.to, subject: input.subject, html, text }),
    });
    if (!res.ok) console.error("email failed", input.subject, res.status, await res.text());
  } catch (error) {
    console.error("email failed", input.subject, error);
  }
}

/* ── Event senders ─────────────────────────────────────── */

export function emailSubmissionReceived(to: string, componentTitle: string, ref: string): Promise<void> {
  return sendEmail({
    to,
    subject: `Submitted for review: ${componentTitle}`,
    heading: `${componentTitle} is in the review queue`,
    body: [
      `A curator reviews every submission before it lists publicly — you'll get an email either way.`,
      `Reference: ${ref}`,
    ],
    cta: { label: "Track it in your dashboard", url: `${ORIGIN}/dashboard/components` },
  });
}

export function emailReviewApproved(to: string, componentTitle: string, ref: string): Promise<void> {
  return sendEmail({
    to,
    subject: `Live: ${componentTitle}`,
    heading: `${componentTitle} is live`,
    body: [
      `Your component passed review and now lists publicly. Installs are digest-verified, and verified installs count toward your profit share.`,
      `Reference: ${ref}`,
    ],
    cta: { label: "See it live", url: `${ORIGIN}/components/${ref.replace(/^@/, "")}` },
  });
}

export function emailReviewRejected(to: string, componentTitle: string, reason: string): Promise<void> {
  return sendEmail({
    to,
    subject: `Changes requested: ${componentTitle}`,
    heading: `${componentTitle} needs changes`,
    body: [
      `A curator reviewed your submission and requested changes before it can list:`,
      `"${reason}"`,
      `Edit the component and resubmit whenever you're ready.`,
    ],
    cta: { label: "Open in the editor", url: `${ORIGIN}/dashboard/components` },
  });
}

export function emailPurchaseBuyer(to: string, itemTitle: string, amountCents: number, installRef: string): Promise<void> {
  return sendEmail({
    to,
    subject: `Your purchase: ${itemTitle}`,
    heading: `You own ${itemTitle}`,
    body: [
      `Amount: $${(amountCents / 100).toFixed(2)}. The license you agreed to is recorded with this purchase and always available from your dashboard.`,
      `Install it: npx modulora login, then npx modulora add ${installRef}`,
    ],
    cta: { label: "Your purchases", url: `${ORIGIN}/dashboard/purchases` },
  });
}

export function emailPurchaseSeller(to: string, itemTitle: string, netCents: number): Promise<void> {
  return sendEmail({
    to,
    subject: `You made a sale: ${itemTitle}`,
    heading: `${itemTitle} just sold`,
    body: [
      `You earned $${(netCents / 100).toFixed(2)} (after Modulora's 10% fee). It transfers to your connected Stripe account automatically.`,
    ],
    cta: { label: "See your earnings", url: `${ORIGIN}/dashboard/earnings` },
  });
}

export function emailPlusWelcome(to: string): Promise<void> {
  return sendEmail({
    to,
    subject: "Welcome to Modulora Plus",
    heading: "You're on Plus",
    body: [
      `Bookmarks, public and private lists, and early access through Labs are live on your account now.`,
      `Part of your subscription joins the profit-share pool — you're directly supporting creators of free components.`,
    ],
    cta: { label: "Open Labs", url: `${ORIGIN}/dashboard/labs` },
  });
}
