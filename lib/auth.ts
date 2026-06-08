import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

// Читает сессию из cookie (быстро, без базы)
export async function getSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session");
  if (!session?.value) return null;
  try {
    return JSON.parse(session.value);
  } catch {
    return null;
  }
}

// Достаёт актуального игрока из базы вместе с ролью и статусом.
// Роль берётся из базы, а не из cookie — подделать нельзя.
export async function getCurrentPlayer() {
  const session = await getSession();
  if (!session?.player_id) return null;

  const { data: player } = await supabase
    .from("players")
    .select("*")
    .eq("id", session.player_id)
    .single();

  return player || null;
}

// Удобные проверки
export async function isAdmin() {
  const player = await getCurrentPlayer();
  return player?.role === "admin";
}

export async function isApproved() {
  const player = await getCurrentPlayer();
  return player?.status === "approved";
}
