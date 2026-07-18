# PatIA Lawn Tennis 🏉

App de la **Clínica de Pateadores "Daniel Tejerizo"** del Tucumán Lawn Tennis Club.
Telemetría, técnica y progresión gamificada para pateadores en formación — de infantiles a veteranos, sin GPS ni hardware: solo el teléfono y el botín.

## Qué hace

- **Cargar sesión**: tocás el mapa de la cancha donde pateaste; la app calcula distancia, ángulo y lado automáticamente. Al cerrar la sesión registrás cansancio (RPE), viento, confianza y diario mental.
- **Inicio**: rango de clínica, XP, racha de días, efectividad semanal e insignias.
- **Stats**: evolución de 14 días, mapa de honestidad por zonas (distancia × ángulo), correlación fatiga vs. puntería, historial.
- **Academia**: los 3 niveles de la clínica (Fundamentos → Trayectoria C→J → Mente de Match) con ejercicios off-field de baja carga (metodología Dave Alred, esfuerzo ≤ 40 %), banco de video y simulador táctico.
- **PatIA**: chat entrenador que analiza tus números reales. Con `ANTHROPIC_API_KEY` usa Claude; sin la key funciona un motor local basado en reglas.

## Correr en desarrollo

```bash
npm install
npm run dev
```

Necesita `.env.local` (no se commitea) con:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...   # publishable key (protegida por RLS)
SUPABASE_ACCESS_TOKEN=...           # solo para administrar el proyecto, nunca al cliente
ANTHROPIC_API_KEY=...               # opcional: activa PatIA con Claude
```

## Arquitectura

- **Next.js 16** (App Router) + Tailwind v4 + Motion + Recharts.
- **Supabase**: auth anónima (cero fricción para los chicos) + Postgres con RLS por jugador. Esquema en `supabase/migrations/0001_init.sql`.
- **Offline-first**: todo se guarda en `localStorage` al instante y se sincroniza a la nube en segundo plano; la app funciona en la cancha sin señal.
- Tipografías: Fraunces (heráldica), Archivo (UI), IBM Plex Mono (telemetría).

Tucumán Lawn Tennis Club · est. 1902
