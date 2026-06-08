import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentPlayer } from "@/lib/auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

export async function POST(req: NextRequest) {
  // Проверяем, что запрос делает админ
  const me = await getCurrentPlayer();
  if (!me || me.role !== "admin") {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const form = await req.formData();
  const playerId = form.get("player_id");
  if (!playerId) {
    return NextResponse.json({ error: "Нет player_id" }, { status: 400 });
  }

  const { error } = await supabase
    .from("players")
    .update({ status: "approved" })
    .eq("id", playerId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Возвращаем админа обратно на страницу заявок
  return NextResponse.redirect(
    new URL("/admin", process.env.NEXT_PUBLIC_APP_URL || "https://volley72.ru")
  );
}
