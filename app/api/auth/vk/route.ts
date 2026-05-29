import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { code, device_id } = await req.json();
    if (!code) return NextResponse.json({ error: "No code" }, { status: 400 });

    const tokenRes = await fetch("https://id.vk.com/oauth2/auth", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: process.env.VK_CLIENT_ID || "54611008",
        client_secret: process.env.VK_CLIENT_SECRET || "",
        redirect_uri: (process.env.NEXT_PUBLIC_APP_URL || "https://volley72.ru") + "/auth/callback",
        device_id: device_id || "",
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return NextResponse.json({ error: "VK token error", details: tokenData }, { status: 400 });
    }

    const userRes = await fetch("https://id.vk.com/oauth2/user_info", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        access_token: tokenData.access_token,
        client_id: process.env.VK_CLIENT_ID || "54611008",
      }),
    });
    const userData = await userRes.json();
    const vkUser = userData.user || userData;
    const vkId = vkUser.user_id || vkUser.id;
    const firstName = vkUser.first_name || "";
    const lastName = vkUser.last_name || "";
    const fullName = (firstName + " " + lastName).trim();
    const photoUrl = vkUser.avatar || vkUser.photo_200 || null;

    let { data: player } = await supabase
      .from("players")
      .select("*")
      .eq("vk_id", vkId)
      .single();

    if (!player) {
      const { data: newPlayer, error } = await supabase
        .from("players")
        .insert({ name: fullName, vk_id: vkId, photo_url: photoUrl })
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      player = newPlayer;
    }

    const sessionValue = JSON.stringify({ player_id: player.id, name: player.name, photo_url: player.photo_url });
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
