import "server-only";

import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

let admin: SupabaseClient | null = null;

/** Cliente con la clave secreta — salta RLS. Solo para rutas API. */
export function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  if (!admin) {
    admin = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return admin;
}

/** Resuelve el usuario autenticado a partir del header Authorization. */
export async function getUserFromRequest(req: Request): Promise<User | null> {
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  const client = getSupabaseAdmin();
  if (!client) return null;
  const { data, error } = await client.auth.getUser(token);
  if (error) return null;
  return data.user;
}
