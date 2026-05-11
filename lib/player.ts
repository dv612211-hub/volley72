export type PlayerGender = "male" | "female";
export type Direction = "beach" | "classic" | "both";
export type GameFormat = "mixed" | "female" | "male" | "park";
export type DominantHand = "right" | "left";
export type AvailableTime =
  | "weekday"
  | "weekend"
  | "any_day"
  | "weekday_day"
  | "weekday_evening"
  | "friday_evening"
  | "weekend_morning"
  | "weekend_day"
  | "weekend_evening";
export type TournamentExp = "none" | "1-5" | "5-10" | "10+";
export type TrainingExp =
  | "none"
  | "sometimes"
  | "regular"
  | "with_coach"
  | "pro_past";
export type PlayerLevel =
  | "novice"
  | "medium"
  | "medium_plus"
  | "high"
  | "pro";

export type Skills = {
  serve: number;
  receive: number;
  attack: number;
  block: number;
  game_sense: number;
};

export type PrizePlace = {
  tournament: string;
  place: number;
  date?: string;
};

export type PublicPlayer = {
  id: string;
  name: string;
  gender: PlayerGender | null;
  level: PlayerLevel;
  photo_url: string | null;
  height: number | null;
  city: string | null;
  direction: Direction | null;
  game_formats: GameFormat[] | null;
  dominant_hand: DominantHand | null;
  tournament_experience: TournamentExp | null;
  training_experience: string | null;
  prize_places: PrizePlace[] | null;
  created_at: string;
};

export const GENDER_LABEL: Record<PlayerGender, string> = {
  male: "Мужской",
  female: "Женский",
};

export const DIRECTION_LABEL: Record<Direction, string> = {
  beach: "Пляжный волейбол",
  classic: "Классический волейбол",
  both: "Играю и там, и там",
};

export const GAME_FORMAT_LABEL: Record<GameFormat, string> = {
  mixed: "Миксты",
  female: "Женские игры",
  male: "Мужские игры",
  park: "Парковый волейбол",
};

export const DOMINANT_HAND_LABEL: Record<DominantHand, string> = {
  right: "Правша",
  left: "Левша",
};

export const AVAILABLE_TIME_LABEL: Record<AvailableTime, string> = {
  weekday: "Будни",
  weekend: "Выходные",
  any_day: "Любой день",
  weekday_day: "Будни днём",
  weekday_evening: "Будни вечером",
  friday_evening: "Пятница вечером",
  weekend_morning: "Выходные утром",
  weekend_day: "Выходные днём",
  weekend_evening: "Выходные вечером",
};

export const TOURNAMENT_EXP_LABEL: Record<TournamentExp, string> = {
  none: "Не участвовал",
  "1-5": "1–5 турниров",
  "5-10": "5–10 турниров",
  "10+": "10+ турниров",
};

export const TRAINING_EXP_LABEL: Record<TrainingExp, string> = {
  none: "Не тренируюсь",
  sometimes: "Иногда тренируюсь",
  regular: "Тренируюсь регулярно",
  with_coach: "Занимаюсь с тренером",
  pro_past: "Раньше занимался профессионально",
};

export const LEVEL_LABEL: Record<PlayerLevel, string> = {
  novice: "Новичок",
  medium: "Средний",
  medium_plus: "Средний+",
  high: "Высокий",
  pro: "Профи",
};

export const LEVEL_COLOR: Record<PlayerLevel, string> = {
  novice: "bg-slate-500/20 text-slate-200 ring-slate-400/30",
  medium: "bg-blue-500/20 text-blue-200 ring-blue-400/30",
  medium_plus: "bg-emerald-500/20 text-emerald-200 ring-emerald-400/30",
  high: "bg-amber-500/20 text-amber-200 ring-amber-400/30",
  pro: "bg-orange-500/25 text-orange-200 ring-orange-400/40",
};

export const SKILL_LABEL: Record<keyof Skills, string> = {
  serve: "Подача",
  receive: "Приём",
  attack: "Атака",
  block: "Блок",
  game_sense: "Игровое понимание",
};

export const SKILL_HINT: Record<keyof Skills, string> = {
  serve: "Стабильность и точность подачи в игре",
  receive: "Умение принять сложную подачу и атаку соперника",
  attack: "Сила, точность и разнообразие атакующих ударов",
  block: "Умение читать атаку и выставлять эффективный блок",
  game_sense:
    "Тактическое мышление, чтение игры, взаимодействие с партнёром",
};

export const SKILL_KEYS: (keyof Skills)[] = [
  "serve",
  "receive",
  "attack",
  "block",
  "game_sense",
];

export function computeLevel(skills: Partial<Skills>): PlayerLevel {
  const values = SKILL_KEYS.map((k) => skills[k]).filter(
    (v): v is number => typeof v === "number" && v > 0,
  );
  if (values.length === 0) return "novice";
  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  if (avg < 1.9) return "novice";
  if (avg < 2.7) return "medium";
  if (avg < 3.5) return "medium_plus";
  if (avg < 4.3) return "high";
  return "pro";
}

export function parseTrainingExperience(raw: string | null): TrainingExp[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as TrainingExp[];
  } catch {
    // fall through to csv split
  }
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean) as TrainingExp[];
}

export function computeAge(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null;
  const d = new Date(birthDate);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age >= 0 && age < 130 ? age : null;
}

export function formatPhone(input: string): string {
  let body = input.replace(/\D/g, "");
  if (body.startsWith("7") || body.startsWith("8")) body = body.slice(1);
  body = body.slice(0, 10);
  if (body.length === 0) return "";
  let out = "+7 (" + body.slice(0, 3);
  if (body.length >= 3) out += ")";
  if (body.length > 3) out += " " + body.slice(3, 6);
  if (body.length > 6) out += "-" + body.slice(6, 8);
  if (body.length > 8) out += "-" + body.slice(8, 10);
  return out;
}

export function isPhoneValid(phone: string): boolean {
  return phone.replace(/\D/g, "").length >= 11;
}

export function avatarInitials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts
    .map((p) => p.charAt(0).toUpperCase())
    .join("")
    .padEnd(1, "?");
}
