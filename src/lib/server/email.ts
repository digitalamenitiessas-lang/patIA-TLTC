import "server-only";

/**
 * Mails transaccionales vía Resend (https://resend.com).
 * Sin RESEND_API_KEY la función es un no-op silencioso: la app
 * funciona igual y el workflow sigue avisando por push.
 */
export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "PatIA TLTC <onboarding@resend.dev>";
  if (!key) return false;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

const WRAP_STYLE =
  "font-family:Georgia,serif;background:#050810;color:#e9edf5;padding:32px;border-radius:16px;max-width:520px;margin:0 auto";
const BTN_STYLE =
  "display:inline-block;background:#e8b400;color:#1a1400;font-weight:bold;padding:12px 24px;border-radius:12px;text-decoration:none;margin-top:16px";

export function emailTemplate({
  title,
  body,
  ctaLabel,
  ctaUrl,
}: {
  title: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
}): string {
  return `
  <div style="${WRAP_STYLE}">
    <p style="letter-spacing:0.18em;text-transform:uppercase;font-size:11px;color:#8c96ab;font-family:monospace">
      Clínica de Pateadores · Daniel Tejerizo
    </p>
    <h1 style="color:#ffd747;font-size:22px;margin:8px 0 16px">${title}</h1>
    <p style="font-size:15px;line-height:1.6;color:#c7cddb">${body}</p>
    ${ctaLabel && ctaUrl ? `<a href="${ctaUrl}" style="${BTN_STYLE}">${ctaLabel}</a>` : ""}
    <p style="margin-top:28px;font-size:11px;color:#4a5468;font-family:monospace">
      PatIA · Tucumán Lawn Tennis Club · est. 1902
    </p>
  </div>`;
}
