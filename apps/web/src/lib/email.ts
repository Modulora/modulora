/**
 * Transactional email (#54) — one shared sender over Resend with templates
 * in code (reviewable, versioned; no dashboard template dependency).
 * Fire-and-forget: a failed email never breaks the action that triggered
 * it. No tracking pixels; links go to modulora.dev.
 */

const ORIGIN = (process.env.BETTER_AUTH_URL ?? "https://modulora.dev").replace(/\/$/, "");

export interface EmailInput {
  to: string;
  subject: string;
  heading: string;
  /** Paragraphs, rendered in order. */
  body: string[];
  cta?: { label: string; url: string };
}

/**
 * Sends via the Resend template "transactional-generic" — duplicated from
 * the brand template (black shell, logo, sign-off) with generic variables:
 * preheader, heading, body1, body2, ctalabel, ctaurl.
 */
const TEMPLATE_ALIAS = process.env.RESEND_TRANSACTIONAL_TEMPLATE ?? "transactional-generic";

export async function sendEmail(input: EmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // Dev without a key: log instead of silently dropping, so flows are testable.
    console.log(`[email] would send: "${input.subject}" → ${input.to}`);
    return;
  }
  // Transactional sender — distinct from the waitlist's RESEND_FROM.
  const from = process.env.RESEND_TRANSACTIONAL_FROM ?? "Modulora <noreply@mail.modulora.dev>";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: input.to,
        subject: input.subject,
        template: {
          id: TEMPLATE_ALIAS,
          variables: {
            preheader: input.subject,
            heading: input.heading,
            body1: input.body[0] ?? "",
            body2: input.body.slice(1).join(" "),
            ctalabel: input.cta?.label ?? "Open Modulora",
            ctaurl: input.cta?.url ?? ORIGIN,
          },
        },
      }),
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

export function emailPasswordChanged(to: string): Promise<void> {
  return sendEmail({
    to,
    subject: "Your password was changed",
    heading: "Password changed",
    body: [
      `Your Modulora password was just changed. Other sessions were signed out.`,
      `If this wasn't you, reset your password immediately and check your connected accounts.`,
    ],
    cta: { label: "Review security settings", url: "https://modulora.dev/dashboard/settings/security" },
  });
}

export function emailAlphaInvitation(
  to: string,
  username: string,
  token: string,
  expiresAt: Date,
): Promise<void> {
  return sendEmail({
    to,
    subject: "Your Modulora alpha invitation",
    heading: `Finish setting up @${username}`,
    body: [
      `You have been invited to the Modulora alpha. This single-use setup link expires on ${expiresAt.toLocaleDateString("en-US", { dateStyle: "medium", timeZone: "UTC" })}.`,
      "Finish with GitHub or establish credentials. If you did not expect this invitation, you can ignore it.",
    ],
    cta: { label: "Finish account setup", url: `${ORIGIN}/invite/${encodeURIComponent(token)}` },
  });
}

export function emailPasswordReset(to: string, url: string): Promise<void> {
  return sendEmail({
    to,
    subject: "Reset your Modulora password",
    heading: "Reset your password",
    body: [
      "Use this single-use link to choose a new password. Other sessions will be signed out after the reset.",
      "If you did not request this change, you can ignore this email.",
    ],
    cta: { label: "Choose a new password", url },
  });
}

export function emailDomainVerified(to: string, domain: string): Promise<void> {
  return sendEmail({
    to,
    subject: `Domain verified: ${domain}`,
    heading: `${domain} is verified`,
    body: [
      `The DNS TXT record checked out — ${domain} is now a verified domain on your account.`,
      `It backs your website badge and lets you sell components from that domain.`,
    ],
    cta: { label: "See your settings", url: "https://modulora.dev/dashboard/settings" },
  });
}

export function emailUsernameChanged(to: string, oldUsername: string, newUsername: string): Promise<void> {
  return sendEmail({
    to,
    subject: `Username changed: @${oldUsername} → @${newUsername}`,
    heading: `You're now @${newUsername}`,
    body: [
      `Your username changed from @${oldUsername} to @${newUsername}. Your public profile and install refs use the new handle.`,
      `If this wasn't you, secure your account immediately.`,
    ],
    cta: { label: "View your profile", url: `https://modulora.dev/${newUsername}` },
  });
}

export function emailPayoutsActive(to: string): Promise<void> {
  return sendEmail({
    to,
    subject: "Payouts are active",
    heading: "You can get paid now",
    body: [
      `Your Stripe account finished verification — payouts are active. Profit-share distributions pay out once your accrued share reaches the threshold.`,
    ],
    cta: { label: "View earnings", url: "https://modulora.dev/dashboard/earnings" },
  });
}
