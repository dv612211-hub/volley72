import {
  LEAGUE_COURT,
  PERIOD_DEFAULT_MINUTES,
  PERIOD_MAX_MINUTES,
  PERIOD_MIN_MINUTES,
  ROUND_TEMPLATE,
  TOURNAMENT_COURT_COUNT,
  TOURNAMENT_FORMAT,
  TOURNAMENT_SPORT_TYPE,
  TOURNAMENT_TIME_PER_GAME,
  roundPlayerIds,
  type Court,
  type Gender,
  type League,
  type LeagueAssignment,
  type Player,
  type RoundNumber,
  type RoundState,
  type SideoutMixtSettings,
  type Slot,
  type Tournament,
} from "@/lib/tournament";

export type PlayerInput = { name: string; gender: Gender };

export function buildSettings(
  males: PlayerInput[],
  females: PlayerInput[],
): SideoutMixtSettings {
  const players: Player[] = [];
  const layout: Record<Court, Record<Gender, Player[]>> = {
    1: { male: [], female: [] },
    2: { male: [], female: [] },
  };

  males.forEach((p, i) => {
    const court: Court = i < 3 ? 1 : 2;
    const slot = ((i % 3) + 1) as Slot;
    const player: Player = {
      id: generateId(),
      name: p.name.trim(),
      gender: "male",
      court,
      slot,
    };
    players.push(player);
    layout[court].male.push(player);
  });

  females.forEach((p, i) => {
    const court: Court = i < 3 ? 1 : 2;
    const slot = ((i % 3) + 1) as Slot;
    const player: Player = {
      id: generateId(),
      name: p.name.trim(),
      gender: "female",
      court,
      slot,
    };
    players.push(player);
    layout[court].female.push(player);
  });

  const rounds: RoundState[] = [];
  for (const court of [1, 2] as Court[]) {
    const malesByCourt = layout[court].male;
    const femalesByCourt = layout[court].female;
    const findBySlot = (list: Player[], slot: Slot) =>
      list.find((p) => p.slot === slot)!;

    for (const round_number of [1, 2, 3] as RoundNumber[]) {
      const tpl = ROUND_TEMPLATE[round_number];
      rounds.push({
        id: generateId(),
        phase: "qualification",
        court,
        round_number,
        king_male_id: findBySlot(malesByCourt, tpl.king[0]).id,
        king_female_id: findBySlot(femalesByCourt, tpl.king[1]).id,
        c1_male_id: findBySlot(malesByCourt, tpl.c1[0]).id,
        c1_female_id: findBySlot(femalesByCourt, tpl.c1[1]).id,
        c2_male_id: findBySlot(malesByCourt, tpl.c2[0]).id,
        c2_female_id: findBySlot(femalesByCourt, tpl.c2[1]).id,
        period_minutes: PERIOD_DEFAULT_MINUTES,
        points_by_player: {},
        status: "scheduled",
        started_at: null,
        finished_at: null,
      });
    }
  }

  return { schema_version: 3, phase: "qualification", players, rounds };
}

export function buildTournament(
  title: string,
  players: PlayerInput[],
  id?: string,
): Tournament {
  const males = players.filter((p) => p.gender === "male");
  const females = players.filter((p) => p.gender === "female");
  if (males.length !== 6 || females.length !== 6) {
    throw new Error("Нужно ровно 6 мужчин и 6 женщин");
  }
  return {
    id: id ?? generateId(),
    title: title.trim(),
    format: TOURNAMENT_FORMAT,
    sport_type: TOURNAMENT_SPORT_TYPE,
    status: "active",
    court_count: TOURNAMENT_COURT_COUNT,
    time_per_game: TOURNAMENT_TIME_PER_GAME,
    settings: buildSettings(males, females),
    created_at: new Date().toISOString(),
  };
}

export type RoundAction =
  | { type: "set_period"; roundId: string; minutes: number }
  | { type: "start"; roundId: string }
  | { type: "finish"; roundId: string }
  | { type: "submit_scores"; roundId: string; points: Record<string, number> }
  | { type: "reset"; roundId: string };

export type PhaseAction =
  | { type: "finalize_qualification" }
  | { type: "finalize_tournament" }
  | { type: "reset_to_qualification" };

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export function generateId(): string {
  try {
    const c =
      typeof globalThis !== "undefined"
        ? (globalThis as { crypto?: { randomUUID?: () => string } }).crypto
        : undefined;
    if (c && typeof c.randomUUID === "function") {
      return c.randomUUID();
    }
  } catch {
    // crypto unavailable — fall through
  }
  const ts = Date.now().toString(36);
  const r1 = Math.random().toString(36).slice(2, 10).padEnd(8, "0");
  const r2 = Math.random().toString(36).slice(2, 10).padEnd(8, "0");
  return `${ts}-${r1}-${r2}`;
}

function uuid(): string {
  return generateId();
}

export function parseRoundAction(body: unknown): ActionResult<RoundAction> {
  const obj = (body ?? {}) as Record<string, unknown>;
  const roundId = obj.roundId;
  const type = obj.type;
  if (typeof roundId !== "string" || !roundId) {
    return { ok: false, error: "roundId required" };
  }
  switch (type) {
    case "start":
    case "finish":
    case "reset":
      return { ok: true, data: { type, roundId } };
    case "set_period": {
      const minutes = Number(obj.minutes);
      if (
        !Number.isFinite(minutes) ||
        minutes < PERIOD_MIN_MINUTES ||
        minutes > PERIOD_MAX_MINUTES
      ) {
        return {
          ok: false,
          error: `minutes must be ${PERIOD_MIN_MINUTES}..${PERIOD_MAX_MINUTES}`,
        };
      }
      return {
        ok: true,
        data: { type, roundId, minutes: Math.round(minutes) },
      };
    }
    case "submit_scores": {
      const raw = obj.points;
      if (!raw || typeof raw !== "object") {
        return { ok: false, error: "points object required" };
      }
      const points: Record<string, number> = {};
      for (const [pid, val] of Object.entries(raw as Record<string, unknown>)) {
        const n = Number(val);
        if (!Number.isInteger(n) || n < 0 || n > 99) {
          return {
            ok: false,
            error: `points[${pid}] must be an integer 0..99`,
          };
        }
        points[pid] = n;
      }
      return { ok: true, data: { type, roundId, points } };
    }
    default:
      return { ok: false, error: "unknown action type" };
  }
}

function applyToRound(round: RoundState, action: RoundAction): RoundState {
  const next = { ...round };
  const nowIso = new Date().toISOString();
  switch (action.type) {
    case "set_period":
      if (round.status !== "scheduled") return round;
      next.period_minutes = action.minutes;
      return next;
    case "start":
      if (round.status === "completed") return round;
      next.status = "in_progress";
      next.started_at = nowIso;
      next.finished_at = null;
      return next;
    case "finish":
      next.status = "awaiting_scores";
      next.finished_at = nowIso;
      return next;
    case "submit_scores": {
      const allowed = new Set(roundPlayerIds(round));
      const cleaned: Record<string, number> = {};
      for (const id of allowed) {
        cleaned[id] = action.points[id] ?? 0;
      }
      next.points_by_player = cleaned;
      next.status = "completed";
      if (!next.finished_at) next.finished_at = nowIso;
      return next;
    }
    case "reset":
      next.status = "scheduled";
      next.started_at = null;
      next.finished_at = null;
      next.points_by_player = {};
      return next;
  }
}

export function applyRoundAction(
  settings: SideoutMixtSettings,
  action: RoundAction,
): ActionResult<SideoutMixtSettings> {
  if (!Array.isArray(settings.rounds)) {
    return { ok: false, error: "settings missing rounds" };
  }
  const idx = settings.rounds.findIndex((r) => r.id === action.roundId);
  if (idx === -1) {
    return { ok: false, error: "round not found" };
  }
  return {
    ok: true,
    data: {
      ...settings,
      rounds: settings.rounds.map((r, i) =>
        i === idx ? applyToRound(r, action) : r,
      ),
    },
  };
}

export function parsePhaseAction(body: unknown): ActionResult<PhaseAction> {
  const obj = (body ?? {}) as Record<string, unknown>;
  const type = obj.type;
  if (
    type === "finalize_qualification" ||
    type === "finalize_tournament" ||
    type === "reset_to_qualification"
  ) {
    return { ok: true, data: { type } };
  }
  return { ok: false, error: "unknown action" };
}

function totalsFromRounds(rounds: RoundState[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const r of rounds) {
    const m = r.points_by_player ?? {};
    for (const [pid, n] of Object.entries(m)) {
      totals.set(pid, (totals.get(pid) ?? 0) + (Number(n) || 0));
    }
  }
  return totals;
}

function buildLeagueRounds(
  league: League,
  males: Player[],
  females: Player[],
): RoundState[] {
  const court = LEAGUE_COURT[league];
  const rounds: RoundState[] = [];
  for (const round_number of [1, 2, 3] as RoundNumber[]) {
    const tpl = ROUND_TEMPLATE[round_number];
    rounds.push({
      id: uuid(),
      phase: league,
      court,
      round_number,
      king_male_id: males[tpl.king[0] - 1].id,
      king_female_id: females[tpl.king[1] - 1].id,
      c1_male_id: males[tpl.c1[0] - 1].id,
      c1_female_id: females[tpl.c1[1] - 1].id,
      c2_male_id: males[tpl.c2[0] - 1].id,
      c2_female_id: females[tpl.c2[1] - 1].id,
      period_minutes: PERIOD_DEFAULT_MINUTES,
      points_by_player: {},
      status: "scheduled",
      started_at: null,
      finished_at: null,
    });
  }
  return rounds;
}

export type PhaseTransition = {
  settings: SideoutMixtSettings;
  status?: "active" | "finished";
};

export function applyPhaseAction(
  settings: SideoutMixtSettings,
  action: PhaseAction,
): ActionResult<PhaseTransition> {
  const phase = settings.phase ?? "qualification";

  if (action.type === "finalize_qualification") {
    if (phase !== "qualification") {
      return { ok: false, error: "Турнир уже не на этапе квалификации" };
    }
    const qrounds = settings.rounds.filter(
      (r) => (r.phase ?? "qualification") === "qualification",
    );
    if (qrounds.length === 0) {
      return { ok: false, error: "Нет туров квалификации" };
    }
    if (!qrounds.every((r) => r.status === "completed")) {
      return { ok: false, error: "Не все туры квалификации завершены" };
    }

    const totals = totalsFromRounds(qrounds);
    const males = settings.players
      .filter((p) => p.gender === "male")
      .sort((a, b) => (totals.get(b.id) ?? 0) - (totals.get(a.id) ?? 0));
    const females = settings.players
      .filter((p) => p.gender === "female")
      .sort((a, b) => (totals.get(b.id) ?? 0) - (totals.get(a.id) ?? 0));
    if (males.length < 6 || females.length < 6) {
      return { ok: false, error: "Нужно по 6 мужчин и 6 женщин" };
    }

    const hardMales = males.slice(0, 3);
    const lightMales = males.slice(3, 6);
    const hardFemales = females.slice(0, 3);
    const lightFemales = females.slice(3, 6);

    const league_slots: Record<string, LeagueAssignment> = {};
    const assign = (list: Player[], league: League) => {
      list.forEach((p, i) => {
        league_slots[p.id] = { league, slot: ((i + 1) as Slot) };
      });
    };
    assign(hardMales, "hard");
    assign(hardFemales, "hard");
    assign(lightMales, "light");
    assign(lightFemales, "light");

    const newRounds: RoundState[] = [
      ...settings.rounds,
      ...buildLeagueRounds("hard", hardMales, hardFemales),
      ...buildLeagueRounds("light", lightMales, lightFemales),
    ];

    return {
      ok: true,
      data: {
        settings: {
          ...settings,
          schema_version: 3,
          phase: "leagues",
          rounds: newRounds,
          league_slots,
        },
      },
    };
  }

  if (action.type === "finalize_tournament") {
    if (phase !== "leagues") {
      return { ok: false, error: "Турнир не на этапе лиг" };
    }
    const leagueRounds = settings.rounds.filter(
      (r) => r.phase === "hard" || r.phase === "light",
    );
    if (leagueRounds.length === 0) {
      return { ok: false, error: "Нет туров лиг" };
    }
    if (!leagueRounds.every((r) => r.status === "completed")) {
      return { ok: false, error: "Не все туры лиг завершены" };
    }
    return {
      ok: true,
      data: {
        settings: { ...settings, phase: "finished" },
        status: "finished",
      },
    };
  }

  if (action.type === "reset_to_qualification") {
    const qualRounds = settings.rounds.filter(
      (r) => (r.phase ?? "qualification") === "qualification",
    );
    return {
      ok: true,
      data: {
        settings: {
          ...settings,
          phase: "qualification",
          rounds: qualRounds,
          league_slots: undefined,
        },
        status: "active",
      },
    };
  }

  return { ok: false, error: "unhandled action" };
}
