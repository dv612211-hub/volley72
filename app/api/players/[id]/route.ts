import { supabaseAdmin } from "@/lib/supabase-admin";

const PUBLIC_COLUMNS =
  "id,name,gender,level,photo_url,height,city,direction,game_formats,dominant_hand,tournament_experience,training_experience,prize_places,created_at";

export async function GET(
  _: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const { data, error } = await supabaseAdmin
    .from("players")
    .select(PUBLIC_COLUMNS)
    .eq("id", id)
    .single();
  if (error || !data) {
    return Response.json(
      { error: error?.message ?? "Игрок не найден" },
      { status: error?.code === "PGRST116" ? 404 : 500 },
    );
  }
  return Response.json({ player: data });
}
