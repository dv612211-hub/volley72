import { supabaseAdmin } from "@/lib/supabase-admin";
import { computeLevel, type Skills } from "@/lib/player";

const PUBLIC_COLUMNS =
  "id,name,gender,level,photo_url,height,city,direction,game_formats,dominant_hand,tournament_experience,training_experience,prize_places,created_at";
const FULL_COLUMNS = `${PUBLIC_COLUMNS},phone,birth_date,available_time,skills`;

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const includeFull = url.searchParams.get("include") === "full";
  const columns = includeFull ? FULL_COLUMNS : PUBLIC_COLUMNS;
  const { data, error } = await supabaseAdmin
    .from("players")
    .select(columns)
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

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const obj = (body ?? {}) as Record<string, unknown>;

  const update: Record<string, unknown> = {};

  if (typeof obj.name === "string") {
    const n = obj.name.trim();
    if (!n) {
      return Response.json({ error: "Имя обязательно" }, { status: 400 });
    }
    update.name = n;
  }

  if (obj.phone === null) {
    update.phone = null;
  } else if (typeof obj.phone === "string") {
    update.phone = obj.phone.trim() || null;
  }

  if (obj.gender === null) {
    update.gender = null;
  } else if (typeof obj.gender === "string" && ALLOWED_GENDERS.has(obj.gender)) {
    update.gender = obj.gender;
  }

  if (obj.birth_date === null) {
    update.birth_date = null;
  } else if (typeof obj.birth_date === "string") {
    const raw = obj.birth_date.trim().slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      const d = new Date(raw);
      const year = d.getUTCFullYear();
      if (!Number.isNaN(d.getTime()) && year >= 1900 && year <= 2100) {
        update.birth_date = raw;
      }
    }
  }

  if (obj.height === null) {
    update.height = null;
  } else if (obj.height !== undefined) {
    const v = pickInt(obj.height, 100, 250);
    if (v !== null) update.height = v;
  }

  if (typeof obj.city === "string") {
    update.city = obj.city.trim() || "Тюмень";
  }

  if (obj.photo_url === null) {
    update.photo_url = null;
  } else if (typeof obj.photo_url === "string") {
    update.photo_url = obj.photo_url.trim() || null;
  }

  if (obj.direction === null) {
    update.direction = null;
  } else if (
    typeof obj.direction === "string" &&
    ALLOWED_DIRECTIONS.has(obj.direction)
  ) {
    update.direction = obj.direction;
  }

  if (Array.isArray(obj.game_formats)) {
    update.game_formats = filterArray<string>(obj.game_formats, ALLOWED_FORMATS);
  }

  if (obj.dominant_hand === null) {
    update.dominant_hand = null;
  } else if (
    typeof obj.dominant_hand === "string" &&
    ALLOWED_HANDS.has(obj.dominant_hand)
  ) {
    update.dominant_hand = obj.dominant_hand;
  }

  if (Array.isArray(obj.available_time)) {
    update.available_time = filterArray<string>(obj.available_time, ALLOWED_TIMES);
  }

  if (obj.tournament_experience === null) {
    update.tournament_experience = null;
  } else if (
    typeof obj.tournament_experience === "string" &&
    ALLOWED_TOURNAMENT_EXP.has(obj.tournament_experience)
  ) {
    update.tournament_experience = obj.tournament_experience;
  }

  if (Array.isArray(obj.training_experience)) {
    const clean = obj.training_experience.filter(
      (x): x is string =>
        typeof x === "string" && ALLOWED_TRAINING_EXP.has(x),
    );
    update.training_experience = clean.length ? JSON.stringify(clean) : null;
  } else if (obj.training_experience === null) {
    update.training_experience = null;
  }

  if (obj.skills && typeof obj.skills === "object") {
    const raw = obj.skills as Record<string, unknown>;
    const skills: Partial<Skills> = {};
    for (const key of [
      "serve",
      "receive",
      "attack",
      "block",
      "game_sense",
    ] as (keyof Skills)[]) {
      const v = pickInt(raw[key], 1, 5);
      if (v !== null) skills[key] = v;
    }
    update.skills = skills;
    update.level = computeLevel(skills);
  }

  if (Object.keys(update).length === 0) {
    return Response.json({ error: "Нет полей для обновления" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("players")
    .update(update)
    .eq("id", id)
    .select(FULL_COLUMNS)
    .single();
  if (error) {
    console.error("patch player:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ player: data });
}
