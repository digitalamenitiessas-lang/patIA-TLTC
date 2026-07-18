import { NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  getUserFromRequest,
} from "@/lib/server/supabase-admin";
import { sendPushToPlayers } from "@/lib/server/push";

/**
 * Anuncia una clínica nueva a todos los jugadores con push activado.
 * Body: { clinicId }
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

  const { clinicId } = (await req.json().catch(() => ({}))) as {
    clinicId?: string;
  };
  if (!clinicId)
    return NextResponse.json({ error: "body inválido" }, { status: 400 });

  const { data: clinic } = await admin
    .from("clinics")
    .select("title, clinic_date, focus")
    .eq("id", clinicId)
    .single();
  if (!clinic)
    return NextResponse.json({ error: "clínica no encontrada" }, { status: 404 });

  const { data: players } = await admin
    .from("player_profiles")
    .select("id")
    .eq("approval_status", "approved");

  const when = new Date(clinic.clinic_date + "T12:00:00").toLocaleDateString(
    "es-AR",
    { weekday: "long", day: "numeric", month: "long" },
  );

  const appUrl = new URL(req.url).origin;
  const pushed = await sendPushToPlayers(
    admin,
    (players ?? []).map((p) => p.id),
    {
      title: `🏉 ${clinic.title}`,
      body: `Nueva clínica el ${when}.${clinic.focus ? ` Foco: ${clinic.focus}.` : ""} Mirá qué practicar hasta entonces.`,
      url: `${appUrl}/clinica`,
    },
  );

  return NextResponse.json({ ok: true, pushed });
}
