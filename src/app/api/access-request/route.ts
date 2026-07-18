import { NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  getUserFromRequest,
} from "@/lib/server/supabase-admin";
import { sendPushToPlayers } from "@/lib/server/push";
import { sendEmail, emailTemplate } from "@/lib/server/email";

/**
 * Un jugador con cuenta Google pendiente avisa que espera aprobación.
 * Notifica a los admins por push y por mail. Deduplica con
 * access_notified_at (máximo un aviso cada 24 h por jugador).
 */
export async function POST(req: Request) {
  const admin = getSupabaseAdmin();
  if (!admin)
    return NextResponse.json({ error: "server sin configurar" }, { status: 503 });

  const user = await getUserFromRequest(req);
  if (!user)
    return NextResponse.json({ error: "no autenticado" }, { status: 401 });

  const { data: profile } = await admin
    .from("player_profiles")
    .select("id, full_name, email, approval_status, access_notified_at")
    .eq("id", user.id)
    .single();

  if (!profile || profile.approval_status !== "pending")
    return NextResponse.json({ ok: true, skipped: "no pendiente" });

  const last = profile.access_notified_at
    ? new Date(profile.access_notified_at).getTime()
    : 0;
  if (Date.now() - last < 24 * 3600_000)
    return NextResponse.json({ ok: true, skipped: "ya avisado" });

  await admin
    .from("player_profiles")
    .update({ access_notified_at: new Date().toISOString() })
    .eq("id", profile.id);

  const who = profile.full_name || profile.email || "Un pateador";
  const appUrl = new URL(req.url).origin;

  // Push a todos los admins aprobados
  const { data: admins } = await admin
    .from("player_profiles")
    .select("id")
    .eq("role", "admin")
    .eq("approval_status", "approved");

  const pushed = await sendPushToPlayers(
    admin,
    (admins ?? []).map((a) => a.id),
    {
      title: "🏉 Nuevo pateador espera aprobación",
      body: `${who} (${profile.email ?? "sin mail"}) quiere entrar a la clínica.`,
      url: `${appUrl}/admin`,
    },
  );

  // Mail al administrador
  const adminEmail = process.env.ADMIN_EMAIL;
  let mailed = false;
  if (adminEmail) {
    mailed = await sendEmail({
      to: adminEmail,
      subject: `PatIA · ${who} espera tu aprobación`,
      html: emailTemplate({
        title: "Nuevo pateador en la puerta del club",
        body: `<b>${who}</b> (${profile.email ?? "sin mail"}) se registró con Google y espera que lo habilites para usar la app de la clínica.`,
        ctaLabel: "Abrir panel de admin",
        ctaUrl: `${appUrl}/admin`,
      }),
    });
  }

  return NextResponse.json({ ok: true, pushed, mailed });
}
