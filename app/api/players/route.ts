import { supabaseAdmin } from "@/lib/supabase-admin";
import { computeLevel, type Skills } from "@/lib/player";

const PUBLIC_COLUMNS =
  "id,name,gender,level,photo_url,height,city,direction,game_formats,dominant_hand,tournament_experience,training_experience,prize_places,created_at";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("players")
    .select(PUBLIC_COLUMNS)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("list players:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ players: data ?? [] });
}

const ALLOWED_GENDERS = new Set(["male", "female"]);
const ALLOWED_DIRECTIONS = new Set(["beach", "classic", "both"]);
const ALLOWED_FORMATS = new Set(["mixed", "female", "male", "park"]);
const ALLOWED_HANDS = new Set(["right", "left"]);
const ALLOWED_TIMES = new Set([
  "weekday",
  "weekend",
  "any_day",
  "weekday_day",
  "weekday_evening",
  "friday_evening",
  "weekend_morning",
  "weekend_day",
  "weekend_evening",
]);
const ALLOWED_TOURNAMENT_EXP = new Set(["none", "1-5", "5-10", "10+"]);
const ALLOWED_TRAINING_EXP = new Set([
  "none",
  "sometimes",
  "regular",
  "with_coach",
  "pro_past",
]);

function pickInt(v: unknown, min: number, max: number): number | null {
  const n = Number(v);
  if (!Number.isInteger(n)) return null;
  if (n < min || n > max) return null;
  return n;
}

function filterArray<T>(v: unknown, allowed: Set<string>): T[] {
  if (!Array.isArray(v)) return [];
  return v.filter(
    (item): item is T => typeof item === "string" && allowed.has(item),
  );
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const obj = (body ?? {}) as Record<string, unknown>;

  const name = typeof obj.name === "string" ? obj.name.trim() : "";
  if (!name) {
    return Response.json({ error: "Имя обязательно" }, { status: 400 });
  }

  const phone =
    typeof obj.phone === "string" && obj.phone.trim()
      ? obj.phone.trim()
      : null;
  const gender =
    typeof obj.gender === "string" && ALLOWED_GENDERS.has(obj.gender)
      ? obj.gender
      : null;
  const age = pickInt(obj.age, 5, 120);
  const height = pickInt(obj.height, 100, 250);
  const city =
    typeof obj.city === "string" && obj.city.trim()
      ? obj.city.trim()
      : "Тюмень";
  const direction =
    typeof obj.direction === "string" && ALLOWED_DIRECTIONS.has(obj.direction)
      ? obj.direction
      : null;
  const game_formats = filterArray<string>(obj.game_formats, ALLOWED_FORMATS);
  const dominant_hand =
    typeof obj.dominant_hand === "string" && ALLOWED_HANDS.has(obj.dominant_hand)
      ? obj.dominant_hand
      : null;
  const available_time = filterArray<string>(obj.available_time, ALLOWED_TIMES);
  const tournament_experience =
    typeof obj.tournament_experience === "string" &&
    ALLOWED_TOURNAMENT_EXP.has(obj.tournament_experience)
      ? obj.tournament_experience
      : null;

  let trainingPayload: string | null = null;
  if (Array.isArray(obj.training_experience)) {
    const clean = obj.training_experience.filter(
      (x): x is string =>
        typeof x === "string" && ALLOWED_TRAINING_EXP.has(x),
    );
    trainingPayload = clean.length ? JSON.stringify(clean) : null;
  } else if (
    typeof obj.training_experience === "string" &&
    ALLOWED_TRAINING_EXP.has(obj.training_experience)
  ) {
    trainingPayload = JSON.stringify([obj.training_experience]);
  }

  const rawSkills =
    obj.skills && typeof obj.skills === "object"
      ? (obj.skills as Record<string, unknown>)
      : {};
  const skills: Partial<Skills> = {};
  for (const key of [
    "serve",
    "receive",
    "attack",
    "block",
    "defense",
    "game_sense",
  ] as (keyof Skills)[]) {
    const v = pickInt(rawSkills[key], 1, 5);
    if (v !== null) skills[key] = v;
  }

  const level = computeLevel(skills);

  const insertBody = {
    name,
    phone,
    gender,
    age,
    height,
    city,
    direction,
    game_formats,
    dominant_hand,
    available_time,
    tournament_experience,
    training_experience: trainingPayload,
    skills,
    level,
    photo_url:
      typeof obj.photo_url === "string" && obj.photo_url.trim()
        ? obj.photo_url.trim()
        : null,
  };

  const { data, error } = await supabaseAdmin
    .from("players")
    .insert(insertBody)
    .select(PUBLIC_COLUMNS)
    .single();

  if (error) {
    console.error("create player:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ player: data }, { status: 201 });
}
