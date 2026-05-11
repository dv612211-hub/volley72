export type Gender = "male" | "female";
export type Court = 1 | 2;
export type Slot = 1 | 2 | 3;
export type RoundNumber = 1 | 2 | 3;
export type RoundStatus =
  | "scheduled"
  | "in_progress"
  | "awaiting_scores"
  | "completed";

export type Phase = "qualification" | "leagues" | "finished";
export type League = "hard" | "light";
export type RoundPhase = "qualification" | League;

export type Player = {
  id: string;
  name: string;
  gender: Gender;
  court: Court;
  slot: Slot;
};

export type LeagueAssignment = {
  league: League;
  slot: Slot;
};

export type RoundState = {
  id: string;
  phase: RoundPhase;
  court: Court;
  round_number: RoundNumber;
  king_male_id: string;
  king_female_id: string;
  c1_male_id: string;
  c1_female_id: string;
  c2_male_id: string;
  c2_female_id: string;
  period_minutes: number;
  points_by_player: Record<string, number>;
  status: RoundStatus;
  started_at: string | null;
  finished_at: string | null;
};

export type SideoutMixtSettings = {
  schema_version: 3;
  phase: Phase;
  players: Player[];
  rounds: RoundState[];
  league_slots?: Record<string, LeagueAssignment>;
};

export const LEAGUE_LABEL: Record<League, string> = {
  hard: "HARD",
  light: "LIGHT",
};

export const GENDER_LABEL: Record<string, string> = {
  male: "М",
  female: "Ж",
};

export const FORMAT_LABEL: Record<string, string> = {
  sideout: "SideOut",
  sideout_mixt: "SideOut Mixt",
  classic: "Классика",
};

export const SPORT_TYPE_LABEL: Record<string, string> = {
  mixed: "Микст",
  men: "Мужской",
  women: "Женский",
  male: "Мужской",
  female: "Женский",
};

export const LEAGUE_COURT: Record<League, Court> = {
  hard: 1,
  light: 2,
};

export type Tournament = {
  id: string;
  title: string;
  format: string;
  sport_type: string;
  status: string;
  court_count: number;
  time_per_game: number;
  settings: SideoutMixtSettings;
  created_at: string;
};

export const TOURNAMENT_FORMAT = "sideout_mixt";
export const TOURNAMENT_SPORT_TYPE = "mixed";
export const TOURNAMENT_COURT_COUNT = 2;
export const TOURNAMENT_TIME_PER_GAME = 15;

export const PERIOD_MIN_MINUTES = 10;
export const PERIOD_MAX_MINUTES = 25;
export const PERIOD_DEFAULT_MINUTES = 15;

export const MISS_SERVE_LIMIT = 3;
export const TOURNAMENT_PERIOD_SECONDS = 900;

export const ROUND_TEMPLATE: Record<
  RoundNumber,
  { king: [Slot, Slot]; c1: [Slot, Slot]; c2: [Slot, Slot] }
> = {
  1: { king: [1, 1], c1: [2, 3], c2: [3, 2] },
  2: { king: [2, 2], c1: [3, 1], c2: [1, 3] },
  3: { king: [3, 3], c1: [1, 2], c2: [2, 1] },
};

export function roundPlayerIds(round: RoundState): string[] {
  return [
    round.king_male_id,
    round.king_female_id,
    round.c1_male_id,
    round.c1_female_id,
    round.c2_male_id,
    round.c2_female_id,
  ];
}

export function readPoints(round: RoundState, playerId: string): number {
  return round.points_by_player?.[playerId] ?? 0;
}
