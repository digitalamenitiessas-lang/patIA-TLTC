-- PatIA Lawn Tennis · Migración 0005
-- Check-in georreferenciado en el club + catálogo curado de videos técnicos.

-- 1 · Sede donde se pateó la sesión (verificada por GPS desde la app)
alter table public.training_sessions
  add column if not exists venue text,
  add column if not exists venue_verified boolean not null default false;

-- 2 · Banco de videos técnicos de la clínica (catálogo curado por Marco)
insert into public.youtube_video_mirror (youtube_video_id, title, description, associated_level, drill_category)
values
  ('WfrrD9BbW70', 'Principio Biomecánico C to J - Dave Alred',
   'Análisis sobre cómo cambiar la trayectoria de la pierna de una forma en C a una forma en J para optimizar la cadena cinética y no sobrecargar las articulaciones.', 1, 'biomecanica'),
  ('Ye4qvxqJYLc', 'Desarrollo de Fuerza y Potencia en la Patada J-Shape',
   'Explicación visual de cómo el torso debe acompañar al balón hacia el objetivo para transferir potencia sin necesidad de usar exclusivamente la fuerza de la pierna.', 1, 'biomecanica'),
  ('968A8IduTKg', 'The Walking Kick - Práctica del paso básico',
   'Drill fundamental a baja velocidad para perfeccionar la colocación del pie de planta respecto de la pelota y automatizar la cadena biomecánica.', 1, 'biomecanica'),
  ('Jv2KySTvlpM', 'Punt Kick: 3 Consejos de Colocación y Suelta',
   'Tutorial enfocado en cómo guiar el balón con la mano del mismo pie ejecutor y la terminación de la cadera orientada al campo de juego.', 2, 'biomecanica'),
  ('XIPSbiXDMG8', 'Técnica de Drop Kick (Bote Pronto)',
   'Los tres pilares para ejecutar una patada de sobrepique consistente: suelta idéntica, bote balanceado e impacto en el momento exacto del rebote.', 2, 'drop_kick'),
  ('mdTZf34a0TQ', 'Técnica de Grubber Kick (Patada al rastrón)',
   'Práctica interactiva para patear el balón en el tercio superior de forma que ruede y se mantenga sobre el nivel del suelo evitando las manos de los defensores.', 2, 'biomecanica'),
  ('cKUOO9H5-cA', 'Guía Completa de Goal Kicking - Del Tee al Follow-Through',
   'Explicación analítica y detallada sobre la configuración del tee de pateo, la alineación visual, los pasos de carrera y la rutina mental pre-pateo.', 3, 'rutina_mental'),
  ('TVIyZeWIDBM', 'Técnica de Patada en Espiral (Spiral Kick)',
   'Cómo configurar las costuras del balón simulando las horas de un reloj para obtener un vuelo en espiral que corte el viento de forma aerodinámica.', 3, 'biomecanica'),
  ('MAH6vN1k2AY', 'Mecánica de Balance y Follow-Through en Espiral',
   'El disparador del movimiento de mano cruzada a pie de patada y cómo culminar el movimiento en total equilibrio físico.', 3, 'biomecanica'),
  ('cNZYDJUmNc0', 'Pairs Practice - Drills Combinados en Parejas',
   'Drills para desarrollar en parejas que combinan drop punts, drop shunts y espirales en movimiento continuo.', 3, 'biomecanica')
on conflict (youtube_video_id) do nothing;
