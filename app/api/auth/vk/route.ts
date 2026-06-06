import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { vk_id, first_name, last_name, photo_url } = await req.json();

    if (!vk_id) {
      return NextResponse.json({ error: "Нет vk_id" }, { status: 400 });
    }

    const fullName = ((first_name || "") + " " + (last_name || "")).trim() || "Игрок";

    let { data: player } = await supabase
      .from("players")
      .select("*")
      .eq("vk_id", vk_id)
      .single();

    if (!player) {
      const { data: newPlayer, error } = await supabase
        .from("players")
        .insert({ name: fullName, vk_id, photo_url: photo_url || null })
        .select()
        .single();
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      player = newPlayer;
    }

    const sessionValue = JSON.stringify({
      player_id: player.id,
      name: player.name,
      photo_url: player.photo_url,
    });

    const response = NextResponse.json({ success: true, player_id: player.id });
    response.cookies.set("session", sessionValue, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
    return response;
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
