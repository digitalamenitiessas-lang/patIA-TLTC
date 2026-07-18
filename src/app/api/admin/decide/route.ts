import { NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  getUserFromRequest,
} from "@/lib/server/supabase-admin";
import { sendPushToPlayers } from "@/lib/server/push";
import { sendEmail, emailTemplate } from "@/lib/server/email";

/**
 * El admin aprueba o rechaza una cuenta. Actualiza el estado y avisa
 * al jugador por push y por mail.
 * Body: { playerId: string, decision: "approved" | "rejected" }
 */
export async function POST(req: Request) {
  const admin = getSupabaseAdmin();
  if (!admin)
    return NextResponse.json({ error: "server sin configurar" }, { status: 503 });

  const user = await getUserFromRequest(req);
  if (!user)
    return NextResponse.json({ error: "no autenticado" }, { status: 401 });

  // Verifica que quien llama sea admin aprobado
  const { data: caller } = await admin
    .from("player_profiles")
    .select("role, approval_status")
    .eq("id", user.id)
    .single();

  if (caller?.role !== "admin" || caller.approval_status !== "approved")
    return NextResponse.json({ error: "solo admins" }, { status: 403 });

  const { playerId, decision } = (await req.json().catch(() => ({}))) as {
    playerId?: string;
    decision?: string;
  };
  if (!playerId || (decision !== "approved" && decision !== "rejected"))
    return NextResponse.json({ error: "body inválido" }, { status: 400 });

  const { data: target } = await admin
    .from("player_profiles")
    .select("id, full_name, email")
    .eq("id", playerId)
    .single();
  if (!target)
    return NextResponse.json({ error: "jugador no encontrado" }, { status: 404 });

  const { error } = await admin
    .from("player_profiles")
    .update({ approval_status: decision, updated_at: new Date().toISOString() })
    .eq("id", playerId);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  const appUrl = new URL(req.url).origin;
  const approved = decision === "approved";

  await sendPushToPlayers(admin, [playerId], {
    title: approved ? "🏉 ¡Bienvenido a la clínica!" : "PatIA · Acceso denegado",
    body: approved
      ? "El entrenador aprobó tu cuenta. Ya podés cargar tus sesiones de pateo."
      : "Tu cuenta no fue habilitada. Hablá con tu entrenador si es un error.",
    url: appUrl,
  });

  if (target.email) {
    await sendEmail({
      to: target.email,
      subject: approved
        ? "PatIA · ¡Tu cuenta fue aprobada!"
        : "PatIA · Estado de tu cuenta",
      html: emailTemplate({
        title: approved
          ? `¡Adentro, ${target.full_name || "pateador"}!`
          : "Tu cuenta no fue habilitada",
        body: approved
          ? "El entrenador de la clínica aprobó tu cuenta. Entrá a la app, cargá tu primera sesión y empezá a sumar XP."
          : "Por ahora tu cuenta no fue habilitada para la Clínica de Pateadores. Si creés que es un error, hablá directamente con tu entrenador.",
        ctaLabel: approved ? "Abrir PatIA" : undefined,
        ctaUrl: approved ? appUrl : undefined,
      }),
    });
  }

  return NextResponse.json({ ok: true });
}
