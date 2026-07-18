import { NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  getUserFromRequest,
} from "@/lib/server/supabase-admin";
import { sendPushToPlayers } from "@/lib/server/push";
import { sendEmail, emailTemplate } from "@/lib/server/email";

/**
 * Un referente (o el admin en su nombre) deja una devolución individual.
 * Inserta el feedback y avisa al jugador por push y mail.
 * Body: { playerId, coachId, body, focusNext?, rating? }
 */
export async function POST(req: Request) {
  const admin = getSupabaseAdmin();
  if (!admin)
    return NextResponse.json({ error: "server sin configurar" }, { status: 503 });

  const user = await getUserFromRequest(req);
  if (!user)
    return NextResponse.json({ error: "no autenticado" }, { status: 401 });

  const { data: caller } = await admin
    .from("player_profiles")
    .select("role, approval_status")
    .eq("id", user.id)
    .single();

  const isStaff =
    (caller?.role === "admin" || caller?.role === "coach") &&
    caller.approval_status === "approved";
  if (!isStaff)
    return NextResponse.json({ error: "solo staff de la clínica" }, { status: 403 });

  const { playerId, coachId, body, focusNext, rating } = (await req
    .json()
    .catch(() => ({}))) as {
    playerId?: string;
    coachId?: string;
    body?: string;
    focusNext?: string;
    rating?: number;
  };

  if (!playerId || !coachId || !body?.trim())
    return NextResponse.json({ error: "body inválido" }, { status: 400 });

  const [{ data: coach }, { data: player }] = await Promise.all([
    admin.from("coaches").select("full_name").eq("id", coachId).single(),
    admin
      .from("player_profiles")
      .select("id, full_name, email")
      .eq("id", playerId)
      .single(),
  ]);

  if (!coach || !player)
    return NextResponse.json({ error: "jugador o referente no encontrado" }, { status: 404 });

  const { error } = await admin.from("coach_feedback").insert({
    player_id: playerId,
    coach_id: coachId,
    author_id: user.id,
    body: body.trim(),
    focus_next: focusNext?.trim() || null,
    rating: rating ?? null,
  });
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  const appUrl = new URL(req.url).origin;

  await sendPushToPlayers(admin, [playerId], {
    title: `🏉 Devolución de ${coach.full_name}`,
    body: "Un referente de la clínica analizó tu pateo. Entrá a leerla.",
    url: `${appUrl}/clinica`,
  });

  if (player.email) {
    await sendEmail({
      to: player.email,
      subject: `PatIA · ${coach.full_name} te dejó una devolución`,
      html: emailTemplate({
        title: `${coach.full_name} analizó tu pateo`,
        body: `Hay una devolución individual esperándote en la sección Clínica de la app. Leela y llevala al próximo entrenamiento.`,
        ctaLabel: "Leer devolución",
        ctaUrl: `${appUrl}/clinica`,
      }),
    });
  }

  return NextResponse.json({ ok: true });
}
