import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { cookies } from "next/headers";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: tournament_id } = await ctx.params;

  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  if (!session) {
    return NextResponse.json({ error: "not_authorized" }, { status: 401 });
  }

  let player_id: string;
  try {
    const parsed = JSON.parse(session);
    player_id = parsed.player_id;
  } catch {
    return NextResponse.json({ error: "invalid_session" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("tournament_registrations")
    .insert({ tournament_id, player_id, status: "pending" })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "already_registered" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, registration: data });
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: tournament_id } = await ctx.params;

  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  if (!session) {
    return NextResponse.json({ error: "not_authorized" }, { status: 401 });
  }

  let player_id: string;
  try {
    const parsed = JSON.parse(session);
    player_id = parsed.player_id;
  } catch {
    return NextResponse.json({ error: "invalid_session" }, { status: 401 });
  }

  await supabaseAdmin
    .from("tournament_registrations")
    .delete()
    .eq("tournament_id", tournament_id)
    .eq("player_id", player_id);

  return NextResponse.json({ success: true });
}
