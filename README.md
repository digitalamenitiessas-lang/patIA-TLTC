# PatIA Lawn Tennis 🏉

App de la **Clínica de Pateadores "Daniel Tejerizo"** del Tucumán Lawn Tennis Club.
Telemetría, técnica y progresión gamificada para pateadores en formación — de infantiles a veteranos, sin GPS ni hardware: solo el teléfono y el botín.

## Qué hace

- **Cargar sesión — cancha táctica por modo**: patear a los palos, salir de 22, buscar touch y jugar rastrón son gestos distintos, y la cancha cambia con cada uno. Palos: distancia, ángulo y dificultad esperable. Salida de 22: zona de caída (corta / contestable / territorial). Touch: dos toques (origen → salida), metros ganados y detección automática del touch. Rastrón: penetración y resultado. Al cerrar la sesión registrás cansancio (RPE), viento, confianza y diario mental.
- **Ranking y torneo semanal**: tabla viva de la clínica (XP server-side); cada lunes arranca un torneo nuevo, y la temporada acumula todo el año.
- **La Clínica**: fecha de la próxima clínica con countdown y plan de práctica, y devoluciones individuales de los referentes del club (Nicolás Sánchez, Federico Mentz, Domingo Miotti, Stefano Ferro, Ignacio Rodríguez Prado). El staff (admin/coach) publica clínicas —con push a todos— y firma devoluciones que notifican al jugador.
- **Inicio**: rango de clínica, XP, racha de días, efectividad semanal e insignias.
- **Stats**: evolución de 14 días, mapa de honestidad por zonas (distancia × ángulo), correlación fatiga vs. puntería, historial.
- **Academia**: los 3 niveles de la clínica (Fundamentos → Trayectoria C→J → Mente de Match) con ejercicios off-field de baja carga (metodología Dave Alred, esfuerzo ≤ 40 %), banco de video y simulador táctico.
- **PatIA**: chat entrenador que analiza tus números reales. Con `ANTHROPIC_API_KEY` usa Claude; sin la key funciona un motor local basado en reglas.
- **Login con Google + aprobación**: los invitados entran sin fricción (sesión anónima); quien se registra con Google queda **pendiente hasta que el administrador lo apruebe** desde `/admin`. Un invitado puede vincular su Google conservando todo su progreso.
- **Notificaciones push (VAPID)**: la app es una PWA instalable; el admin recibe push cuando alguien pide acceso y el jugador cuando lo aprueban. Se activan desde Perfil.
- **Mails (Resend)**: los mismos avisos del workflow de aprobación salen por mail si hay `RESEND_API_KEY`.

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
SUPABASE_SECRET_KEY=...             # rutas API del servidor (push/mails), jamás al cliente
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...    # web push
VAPID_PRIVATE_KEY=...               # web push (servidor)
VAPID_SUBJECT=mailto:...
RESEND_API_KEY=...                  # opcional: activa los mails
EMAIL_FROM=PatIA TLTC <onboarding@resend.dev>
ADMIN_EMAIL=...                     # a dónde avisar los pedidos de acceso
ANTHROPIC_API_KEY=...               # opcional: activa PatIA con Claude
```

## Pasos manuales pendientes (una sola vez)

1. **Google OAuth**: en [Google Cloud Console](https://console.cloud.google.com/apis/credentials) crear una credencial *OAuth client ID* (tipo Web) con redirect URI `https://cuykzcqbjafetpuphnqa.supabase.co/auth/v1/callback`, y pegar client ID + secret en Supabase → Authentication → Providers → Google. Las URLs de redirección de la app ya quedaron configuradas.
2. **Resend**: crear una API key en [resend.com](https://resend.com/api-keys) y pegarla en `RESEND_API_KEY`. Con dominio propio verificado, actualizar `EMAIL_FROM`.

## Roles y aprobación

- El mail `marco.rossi@derecho.unt.edu.ar` se convierte en **admin aprobado** automáticamente al entrar con Google (trigger `handle_new_user`).
- El admin ve `/admin` (aparece en la navegación): aprueba, rechaza, rehabilita o revoca cuentas.
- Los usuarios pendientes ven una pantalla de espera; la RLS además les bloquea escribir sesiones/patadas hasta ser aprobados.

## Arquitectura

- **Next.js 16** (App Router) + Tailwind v4 + Motion + Recharts.
- **Responsive**: bottom nav en el teléfono, sidebar en escritorio (breakpoint `lg`); cada página reacomoda sus tarjetas en grillas de dos columnas.
- **Supabase**: auth anónima + Google (PKCE) + Postgres con RLS por jugador y políticas de admin. Esquema en `supabase/migrations/`.
- **Web push**: `public/sw.js` + tabla `push_subscriptions` + `web-push` en rutas API (`/api/access-request`, `/api/admin/decide`).
- **Offline-first**: todo se guarda en `localStorage` al instante y se sincroniza a la nube en segundo plano; la app funciona en la cancha sin señal.
- Tipografías: Fraunces (heráldica), Archivo (UI), IBM Plex Mono (telemetría).

Tucumán Lawn Tennis Club · est. 1902
