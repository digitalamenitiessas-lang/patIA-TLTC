"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import { usePlayer } from "@/lib/store";
import { buildSummary, localCoach } from "@/lib/coach";

interface Msg {
  role: "user" | "patia";
  text: string;
}

const SUGGESTIONS = [
  "¿Cómo mejoro mi efectividad?",
  "¿Me afecta el cansancio?",
  "¿Cómo gano distancia?",
  "Dame una rutina mental",
];

export default function PatiaPage() {
  const { stats } = usePlayer();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  const send = async (text: string) => {
    const clean = text.trim();
    if (!clean || thinking) return;
    setInput("");
    const history = messages;
    setMessages((m) => [...m, { role: "user", text: clean }]);
    setThinking(true);

    const summary = buildSummary(stats);
    let reply: string;
    try {
      const res = await fetch("/api/patia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: clean,
          summary,
          history: history.map((m) => ({ role: m.role, text: m.text })),
        }),
      });
      if (!res.ok) throw new Error("api");
      const data = await res.json();
      reply = data.text;
    } catch {
      reply = localCoach(clean, summary);
    }

    setThinking(false);
    setMessages((m) => [...m, { role: "patia", text: reply }]);
  };

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-8rem)] w-full flex-col lg:min-h-[calc(100dvh-7rem)] lg:max-w-2xl">
      <header className="mb-4 flex items-center gap-3">
        <div className="relative">
          <Image src="/escudo.webp" alt="PatIA" width={40} height={43} />
          <span className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-pitch-950 bg-try-400" />
        </div>
        <div>
          <h1 className="display text-xl text-chalk">PatIA</h1>
          <p className="tech-label">Tu entrenador de pateo · conoce tus números</p>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto pb-4">
        {messages.length === 0 && (
          <div className="tele-card px-5 py-5">
            <p className="text-sm leading-relaxed text-chalk-dim">
              ¡Hola! Soy <span className="text-gold-300">PatIA</span>, el entrenador
              digital de la clínica. Analizo tus patadas, tu fatiga y tu diario
              mental para darte consejos a medida. ¿Por dónde empezamos?
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-gold-400/35 bg-gold-400/10 px-3.5 py-2 text-xs text-gold-300 active:scale-95"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              m.role === "user"
                ? "self-end rounded-br-md bg-navy-500/50 text-chalk"
                : "tele-card self-start rounded-bl-md text-chalk-dim"
            }`}
          >
            {m.text}
          </motion.div>
        ))}

        {thinking && (
          <div className="tele-card flex gap-1.5 self-start rounded-bl-md px-4 py-3.5">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-gold-400"
                animate={{ opacity: [0.25, 1, 0.25] }}
                transition={{ repeat: Infinity, duration: 1, delay: i * 0.18 }}
              />
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="sticky bottom-24 flex gap-2 lg:bottom-8"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Preguntale a PatIA…"
          className="flex-1 rounded-2xl border border-navy-300/25 bg-pitch-800/95 px-4 py-3.5 text-sm text-chalk placeholder:text-chalk-faint backdrop-blur focus:border-gold-400/50 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!input.trim() || thinking}
          aria-label="Enviar"
          className="btn-gold flex h-12 w-12 items-center justify-center rounded-2xl disabled:opacity-40"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h13M13 6l6 6-6 6" />
          </svg>
        </button>
      </form>
    </main>
  );
}
