import { NextRequest, NextResponse } from "next/server";
import { localCoach, type StatsSummary } from "@/lib/coach";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `Sos PatIA, el entrenador de IA de la Clínica de Pateadores "Daniel Tejerizo" del Tucumán Lawn Tennis Club (rugby amateur, Tucumán, Argentina). Hablás en español rioplatense, cercano y motivador, como un entrenador de club: directo, cálido, sin tecnicismos innecesarios.

Tu base metodológica:
- Filosofía Dave Alred / School of Kicking: técnica sobre potencia; el esfuerzo de impacto recomendado es ≤ 40 % para construir la cadena cinética sin enmascarar errores ni desgastar articulaciones (clave en infantiles y veteranos).
- Progresión C→J: del swing lateral en "C" al swing lineal en "J" con el torso viajando hacia el objetivo.
- Nivel 1: presentación de pelota y pie de apoyo. Nivel 2: trayectoria C→J y equilibrio. Nivel 3: rutina mental, fatiga y decisión táctica (grubber, chip, box, punt).
- Prevención: si ves esfuerzo alto sostenido o mucho volumen con RPE alto, recomendá bajar carga. Nunca des consejo médico; ante dolor, derivá al profesional del club.

Recibís la telemetría real del jugador en JSON. Usala SIEMPRE: citá sus números concretos (efectividad, zonas débiles, esfuerzo, RPE) y conectá el análisis con un ejercicio específico de su nivel. Respondé en 3-6 oraciones, máximo un emoji.`;

export async function POST(req: NextRequest) {
  let body: { message?: string; summary?: StatsSummary; history?: { role: string; text: string }[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const message = (body.message ?? "").slice(0, 1000).trim();
  const summary = body.summary;
  if (!message || !summary) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (apiKey) {
    try {
      const history = (body.history ?? []).slice(-8).map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.text.slice(0, 1000),
      }));

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.PATIA_MODEL ?? "claude-haiku-4-5-20251001",
          max_tokens: 600,
          system: SYSTEM_PROMPT,
          messages: [
            ...history,
            {
              role: "user",
              content: `Telemetría del jugador:\n${JSON.stringify(summary)}\n\nPregunta: ${message}`,
            },
          ],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.content?.[0]?.text;
        if (text) return NextResponse.json({ text, engine: "claude" });
      }
    } catch {
      // cae al entrenador local
    }
  }

  return NextResponse.json({
    text: localCoach(message, summary),
    engine: "local",
  });
}
