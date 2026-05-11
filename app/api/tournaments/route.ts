import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  TOURNAMENT_COURT_COUNT,
  TOURNAMENT_FORMAT,
  TOURNAMENT_SPORT_TYPE,
  TOURNAMENT_TIME_PER_GAME,
} from "@/lib/tournament";
import { buildSettings, type PlayerInput } from "@/lib/tournament-actions";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { title, players } = (body ?? {}) as Record<string, unknown>;
  if (typeof title !== "string" || !title.trim()) {
    return Response.json({ error: "title is required" }, { status: 400 });
  }
  if (!Array.isArray(players) || players.length !== 12) {
    return Response.json(
      { error: "Нужно ровно 12 игроков" },
      { status: 400 },
    );
  }

  const validated: PlayerInput[] = [];
  for (let i = 0; i < players.length; i++) {
    const raw = players[i] as Record<string, unknown>;
    const name = typeof raw?.name === "string" ? raw.name.trim() : "";
    const gender = raw?.gender;
    if (!name) {
      return Response.json(
        { error: `Игрок #${i + 1}: имя не заполнено` },
        { status: 400 },
      );
    }
    if (gender !== "male" && gender !== "female") {
      return Response.json(
        { error: `Игрок #${i + 1}: пол не выбран` },
        { status: 400 },
      );
    }
    validated.push({ name, gender });
  }

  const males = validated.filter((p) => p.gender === "male");
  const females = validated.filter((p) => p.gender === "female");
  if (males.length !== 6 || females.length !== 6) {
    return Response.json(
      {
        error: `Нужно 6 мужчин и 6 женщин. Сейчас: М ${males.length} / Ж ${females.length}`,
      },
      { status: 400 },
    );
  }

  const settings = buildSettings(males, females);

  const { data, error } = await supabaseAdmin
    .from("tournaments")
    .insert({
      title: title.trim(),
      format: TOURNAMENT_FORMAT,
      sport_type: TOURNAMENT_SPORT_TYPE,
      court_count: TOURNAMENT_COURT_COUNT,
      time_per_game: TOURNAMENT_TIME_PER_GAME,
      status: "active",
      settings,
    })
    .select()
    .single();

  if (error) {
    console.error("create tournament:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ tournament: data }, { status: 201 });
}
