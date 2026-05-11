import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(
  _: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const { data, error } = await supabaseAdmin
    .from("tournaments")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) {
    return Response.json(
      { error: error?.message ?? "not found" },
      { status: error?.code === "PGRST116" ? 404 : 500 },
    );
  }
  return Response.json({ tournament: data });
}
