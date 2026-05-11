"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  LEAGUE_LABEL,
  PERIOD_DEFAULT_MINUTES,
  PERIOD_MAX_MINUTES,
  PERIOD_MIN_MINUTES,
  readPoints,
  roundPlayerIds,
  type Court,
  type Gender,
  type League,
  type Phase,
  type Player,
  type RoundState,
  type SideoutMixtSettings,
  type Tournament,
} from "@/lib/tournament";
import {
  applyPhaseAction,
  applyRoundAction,
  type PhaseAction,
  type RoundAction,
} from "@/lib/tournament-actions";
import {
  downloadBackup,
  isBackupPayload,
  isLocalId,
  loadTournamentState,
  migrateLocalToServer,
  saveTournamentState,
  type SyncStatus,
} from "@/lib/offline";

type Props = { tournament: Tournament };
type TabId = "match" | "standings";

type TournamentCtx = {
  state: Tournament;
  online: boolean;
  syncStatus: SyncStatus;
  lastSavedAt: number | null;
  dispatchRound: (action: RoundAction) => Promise<void>;
  dispatchPhase: (action: PhaseAction) => Promise<void>;
  syncNow: () => Promise<void>;
  replaceState: (next: Tournament) => Promise<void>;
  forcePhase: (phase: Phase) => Promise<void>;
};

const TournamentContext = createContext<TournamentCtx | null>(null);

function useTournament(): TournamentCtx {
  const ctx = useContext(TournamentContext);
  if (!ctx) throw new Error("TournamentContext is missing");
  return ctx;
}

const tapStyle = {
  touchAction: "manipulation" as const,
  userSelect: "none" as const,
  WebkitUserSelect: "none" as const,
  WebkitTapHighlightColor: "transparent",
};

function getPhase(settings: SideoutMixtSettings): Phase {
  return settings.phase ?? "qualification";
}

function playerSlotLabel(
  player: Player,
  phase: Phase,
  settings: SideoutMixtSettings,
): string {
  const letter = player.gender === "male" ? "М" : "Ж";
  if (phase === "leagues" || phase === "finished") {
    const a = settings.league_slots?.[player.id];
    if (a) return `${letter}${a.slot}`;
  }
  return `${letter}${player.slot}`;
}

export function TournamentView({ tournament: initial }: Props) {
  const router = useRouter();
  const [state, setState] = useState<Tournament>(initial);
  const [online, setOnline] = useState<boolean>(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("synced");
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [migrating, setMigrating] = useState(false);

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Auto-migrate local-only tournaments to the server when online.
  useEffect(() => {
    if (!hydrated) return;
    if (!online) return;
    if (migrating) return;
    if (!isLocalId(state.id)) return;
    let cancelled = false;
    setMigrating(true);
    console.log("[tournament] migrating local to server:", state.id);
    migrateLocalToServer(state)
      .then((migrated) => {
        if (cancelled) return;
        console.log(
          "[tournament] migration ok, redirect to",
          migrated.id,
        );
        router.replace(`/tournaments/${migrated.id}`);
      })
      .catch((err) => {
        console.warn("[tournament] migration failed:", err);
      })
      .finally(() => {
        if (!cancelled) setMigrating(false);
      });
    return () => {
      cancelled = true;
    };
  }, [hydrated, online, state, migrating, router]);

  // Online/offline detection
  useEffect(() => {
    if (typeof window === "undefined") return;
    setOnline(navigator.onLine);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  // Hydrate from IDB on mount: prefer local if exists
  useEffect(() => {
    let cancelled = false;
    loadTournamentState(initial.id)
      .then((stored) => {
        if (cancelled) return;
        if (stored && stored.state && stored.state.id === initial.id) {
          setState(stored.state);
          setLastSavedAt(stored.savedAt);
        }
        setHydrated(true);
      })
      .catch(() => {
        setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced IDB autosave (500ms after any state change)
  useEffect(() => {
    if (!hydrated) return;
    const timeout = setTimeout(() => {
      saveTournamentState(state.id, state)
        .then((savedAt) => {
          setLastSavedAt(savedAt);
          setSyncStatus((prev) =>
            prev === "synced" ? prev : online ? "syncing" : "local",
          );
        })
        .catch(() => {
          setSyncStatus("local_unsaved");
        });
    }, 500);
    return () => clearTimeout(timeout);
  }, [state, hydrated, online]);

  // Server sync: fires on state change (when online) and on online transitions
  const pushSync = useCallback(async () => {
    const cur = stateRef.current;
    if (isLocalId(cur.id)) {
      // Local-only tournament — server doesn't know about it yet.
      // The migration effect will create it; periodic sync skips meanwhile.
      setSyncStatus("local");
      return;
    }
    setSyncStatus("syncing");
    try {
      const res = await fetch(`/api/tournaments/${cur.id}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          state: cur,
          savedAt: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSyncStatus("synced");
    } catch {
      setSyncStatus(navigator.onLine ? "error" : "local");
    }
  }, []);

  // Sync immediately on every state change when online
  useEffect(() => {
    if (!hydrated) return;
    if (!online) {
      setSyncStatus("local");
      return;
    }
    const timeout = setTimeout(() => {
      pushSync();
    }, 600);
    return () => clearTimeout(timeout);
  }, [state, online, hydrated, pushSync]);

  // Periodic sync every 30s when online
  useEffect(() => {
    if (!online || !hydrated) return;
    const id = setInterval(() => {
      pushSync();
    }, 30000);
    return () => clearInterval(id);
  }, [online, hydrated, pushSync]);

  const dispatchRound = useCallback(
    async (action: RoundAction): Promise<void> => {
      const cur = stateRef.current;
      const result = applyRoundAction(cur.settings, action);
      if (!result.ok) throw new Error(result.error);
      setState({ ...cur, settings: result.data });
    },
    [],
  );

  const dispatchPhase = useCallback(
    async (action: PhaseAction): Promise<void> => {
      const cur = stateRef.current;
      const result = applyPhaseAction(cur.settings, action);
      if (!result.ok) throw new Error(result.error);
      setState({
        ...cur,
        settings: result.data.settings,
        status: result.data.status ?? cur.status,
      });
    },
    [],
  );

  const replaceState = useCallback(
    async (next: Tournament): Promise<void> => {
      setState(next);
    },
    [],
  );

  const forcePhase = useCallback(
    async (phase: Phase): Promise<void> => {
      setState((cur) => ({
        ...cur,
        settings: { ...cur.settings, phase },
      }));
    },
    [],
  );

  const ctx: TournamentCtx = {
    state,
    online,
    syncStatus,
    lastSavedAt,
    dispatchRound,
    dispatchPhase,
    syncNow: pushSync,
    replaceState,
    forcePhase,
  };

  const settings = state.settings;
  const phase = getPhase(settings);
  const [tab, setTab] = useState<TabId>(
    phase === "finished" ? "standings" : "match",
  );
  const playerMap = useMemo(
    () => new Map(settings.players.map((p) => [p.id, p])),
    [settings.players],
  );

  return (
    <TournamentContext.Provider value={ctx}>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-24 pt-3 sm:px-6">
        <SyncBar />
        <BackupBar />

        <div className="sticky top-[57px] z-10 -mx-4 mb-4 flex gap-1 border-b border-white/5 bg-[#0b1535]/90 px-4 backdrop-blur sm:-mx-6 sm:px-6">
          {(
            [
              { id: "match", label: phase === "finished" ? "Турнир" : "Тур" },
              {
                id: "standings",
                label: phase === "finished" ? "Награждение" : "Итоги",
              },
            ] as const
          ).map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                style={tapStyle}
                className={`relative flex-1 px-4 py-3 text-sm font-semibold transition ${
                  active ? "text-white" : "text-slate-400"
                }`}
              >
                {t.label}
                {active && (
                  <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-orange-500" />
                )}
              </button>
            );
          })}
        </div>

        {tab === "match" ? (
          <MatchTab tournament={state} playerMap={playerMap} phase={phase} />
        ) : (
          <StandingsTab
            tournament={state}
            playerMap={playerMap}
            phase={phase}
          />
        )}
      </main>
    </TournamentContext.Provider>
  );
}

function SyncBar() {
  const { online, syncStatus, lastSavedAt } = useTournament();
  const config = (() => {
    if (online && syncStatus === "synced") {
      return {
        dot: "🟢",
        text: "Онлайн · Сохранено",
        cls: "text-emerald-300 border-emerald-400/30 bg-emerald-500/10",
      };
    }
    if (online && (syncStatus === "syncing")) {
      return {
        dot: "🟡",
        text: "Онлайн · Сохраняется…",
        cls: "text-amber-200 border-amber-400/30 bg-amber-500/10",
      };
    }
    if (online && (syncStatus === "error" || syncStatus === "local")) {
      return {
        dot: "🟡",
        text: "Онлайн · Сохраняется…",
        cls: "text-amber-200 border-amber-400/30 bg-amber-500/10",
      };
    }
    if (!online && syncStatus !== "local_unsaved") {
      return {
        dot: "🟠",
        text: "Офлайн · Сохранено локально",
        cls: "text-orange-300 border-orange-400/30 bg-orange-500/10",
      };
    }
    return {
      dot: "🔴",
      text: "Офлайн · Не сохранено!",
      cls: "text-rose-300 border-rose-400/30 bg-rose-500/10",
    };
  })();

  const tsLabel = lastSavedAt
    ? new Date(lastSavedAt).toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : null;

  return (
    <div
      className={`mb-2 flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium ${config.cls}`}
    >
      <span aria-hidden>{config.dot}</span>
      <span className="flex-1">{config.text}</span>
      {tsLabel && (
        <span className="text-[10px] text-slate-400 tabular-nums">
          {tsLabel}
        </span>
      )}
    </div>
  );
}

function BackupBar() {
  const { state, replaceState } = useTournament();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingRestore, setPendingRestore] = useState<Tournament | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  function onBackupClick() {
    downloadBackup(state);
  }

  function onRestoreClick() {
    fileInputRef.current?.click();
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setRestoreError(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!isBackupPayload(parsed)) {
        throw new Error("Файл не является резервной копией Volley72");
      }
      setPendingRestore(parsed.tournament);
    } catch (err) {
      setRestoreError(err instanceof Error ? err.message : String(err));
    }
  }

  async function confirmRestore() {
    if (!pendingRestore) return;
    await replaceState(pendingRestore);
    setPendingRestore(null);
  }

  function cancelRestore() {
    setPendingRestore(null);
  }

  return (
    <div className="mb-3 flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onBackupClick}
        style={tapStyle}
        className="flex-1 rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-slate-200"
      >
        💾 Скачать резервную копию
      </button>
      <button
        type="button"
        onClick={onRestoreClick}
        style={tapStyle}
        className="flex-1 rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-slate-200"
      >
        📂 Восстановить из файла
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        onChange={onFile}
        className="hidden"
      />
      {restoreError && (
        <p className="basis-full rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          {restoreError}
        </p>
      )}
      {pendingRestore && (
        <RestoreConfirm
          incoming={pendingRestore}
          onConfirm={confirmRestore}
          onCancel={cancelRestore}
        />
      )}
    </div>
  );
}

function RestoreConfirm({
  incoming,
  onConfirm,
  onCancel,
}: {
  incoming: Tournament;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const settings = incoming.settings ?? ({} as SideoutMixtSettings);
  const phase = settings.phase ?? "qualification";
  const playerCount = settings.players?.length ?? 0;
  const phaseLabel =
    phase === "qualification"
      ? "Квалификация"
      : phase === "leagues"
        ? "Лиги"
        : "Завершён";
  const created = incoming.created_at
    ? new Date(incoming.created_at).toLocaleString("ru-RU")
    : "—";

  return (
    <div className="basis-full rounded-2xl border border-orange-400/30 bg-[#0b1535] p-4">
      <p className="mb-2 text-sm font-bold text-orange-300">
        Подтвердите восстановление
      </p>
      <ul className="mb-4 space-y-1 text-xs text-slate-300">
        <li>
          <span className="text-slate-500">Название:</span>{" "}
          <span className="font-semibold text-white">{incoming.title}</span>
        </li>
        <li>
          <span className="text-slate-500">Создан:</span> {created}
        </li>
        <li>
          <span className="text-slate-500">Фаза:</span> {phaseLabel}
        </li>
        <li>
          <span className="text-slate-500">Игроков:</span> {playerCount}
        </li>
      </ul>
      <p className="mb-3 text-xs text-rose-300">
        Текущее состояние турнира будет заменено.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          style={tapStyle}
          className="h-10 flex-1 rounded-xl border border-white/15 text-xs font-semibold text-slate-300"
        >
          Отмена
        </button>
        <button
          type="button"
          onClick={onConfirm}
          style={tapStyle}
          className="h-10 flex-1 rounded-xl bg-orange-500 text-xs font-bold text-[#0b1535]"
        >
          Восстановить
        </button>
      </div>
    </div>
  );
}

function MatchTab({
  tournament,
  playerMap,
  phase,
}: {
  tournament: Tournament;
  playerMap: Map<string, Player>;
  phase: Phase;
}) {
  if (phase === "qualification") {
    return (
      <RoundsBoard
        tournament={tournament}
        playerMap={playerMap}
        phase={phase}
        groups={[
          { key: "1", label: "Корт 1", filter: (r) => r.court === 1 && r.phase === "qualification" },
          { key: "2", label: "Корт 2", filter: (r) => r.court === 2 && r.phase === "qualification" },
        ]}
      />
    );
  }
  if (phase === "leagues") {
    return (
      <RoundsBoard
        tournament={tournament}
        playerMap={playerMap}
        phase={phase}
        groups={[
          { key: "hard", label: LEAGUE_LABEL.hard, filter: (r) => r.phase === "hard" },
          { key: "light", label: LEAGUE_LABEL.light, filter: (r) => r.phase === "light" },
        ]}
      />
    );
  }
  return <FinishedNotice />;
}

type RoundsGroup = {
  key: string;
  label: string;
  filter: (r: RoundState) => boolean;
};

function RoundsBoard({
  tournament,
  playerMap,
  phase,
  groups,
}: {
  tournament: Tournament;
  playerMap: Map<string, Player>;
  phase: Phase;
  groups: RoundsGroup[];
}) {
  const [activeGroup, setActiveGroup] = useState<string>(groups[0].key);
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);

  const group = groups.find((g) => g.key === activeGroup) ?? groups[0];
  const rounds = tournament.settings.rounds.filter(group.filter);

  const activeIdx = rounds.findIndex((r) => r.status !== "completed");
  const round =
    rounds.find((r) => r.id === selectedRoundId) ??
    (activeIdx >= 0 ? rounds[activeIdx] : rounds[rounds.length - 1]);

  function goNext() {
    if (!round) return;
    const next = rounds.find((r) => r.round_number > round.round_number);
    if (next) setSelectedRoundId(next.id);
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-1">
        {groups.map((g) => {
          const active = g.key === activeGroup;
          const groupRounds = tournament.settings.rounds.filter(g.filter);
          const completed = groupRounds.filter(
            (r) => r.status === "completed",
          ).length;
          return (
            <button
              key={g.key}
              type="button"
              onClick={() => {
                setActiveGroup(g.key);
                setSelectedRoundId(null);
              }}
              style={tapStyle}
              className={`flex-1 rounded-xl py-3 text-sm font-bold transition ${
                active
                  ? "bg-orange-500 text-[#0b1535]"
                  : "text-slate-300"
              }`}
            >
              {g.label}
              <span
                className={`ml-2 inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  active ? "bg-[#0b1535]/20" : "bg-white/10"
                }`}
              >
                {completed}/{groupRounds.length}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex gap-2">
        {rounds.map((r) => {
          const active = r.id === round?.id;
          const done = r.status === "completed";
          const inProgress = r.status === "in_progress";
          const awaiting = r.status === "awaiting_scores";
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => setSelectedRoundId(r.id)}
              style={tapStyle}
              className={`flex-1 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                active
                  ? "border-orange-400/40 bg-orange-500/10 text-orange-300"
                  : done
                    ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
                    : awaiting
                      ? "border-amber-400/30 bg-amber-500/10 text-amber-300"
                      : inProgress
                        ? "border-blue-400/30 bg-blue-500/10 text-blue-200"
                        : "border-white/10 bg-white/[0.03] text-slate-300"
              }`}
            >
              Тур {r.round_number}
              {done && " ✓"}
            </button>
          );
        })}
      </div>

      {round && (
        <RoundPanel
          tournament={tournament}
          round={round}
          playerMap={playerMap}
          phase={phase}
          onAdvance={goNext}
        />
      )}
    </div>
  );
}

function FinishedNotice() {
  return (
    <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/[0.06] p-6 text-center">
      <p className="text-3xl">🏆</p>
      <p className="mt-3 text-base font-bold text-emerald-300">
        Турнир завершён
      </p>
      <p className="mt-1 text-sm text-slate-400">
        Откройте вкладку «Награждение», чтобы увидеть призёров.
      </p>
    </div>
  );
}

function RoundPanel({
  tournament,
  round,
  playerMap,
  phase,
  onAdvance,
}: {
  tournament: Tournament;
  round: RoundState;
  playerMap: Map<string, Player>;
  phase: Phase;
  onAdvance: () => void;
}) {
  const status = round.status;
  const groupLabel =
    round.phase === "qualification"
      ? `Корт ${round.court}`
      : LEAGUE_LABEL[round.phase];

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Тур {round.round_number} · {groupLabel}
        </span>
        <StatusBadge status={status} />
      </div>

      <PairsSummary round={round} playerMap={playerMap} phase={phase} settings={tournament.settings} />

      {status === "scheduled" && (
        <PreStartView tournament={tournament} round={round} />
      )}
      {status === "in_progress" && (
        <InProgressView tournament={tournament} round={round} />
      )}
      {status === "awaiting_scores" && (
        <ScoreEntryView
          tournament={tournament}
          round={round}
          playerMap={playerMap}
          phase={phase}
          onSaved={onAdvance}
        />
      )}
      {status === "completed" && (
        <CompletedView
          tournament={tournament}
          round={round}
          playerMap={playerMap}
          phase={phase}
          onAdvance={onAdvance}
        />
      )}
    </section>
  );
}

function PairsSummary({
  round,
  playerMap,
  phase,
  settings,
}: {
  round: RoundState;
  playerMap: Map<string, Player>;
  phase: Phase;
  settings: SideoutMixtSettings;
}) {
  return (
    <div className="space-y-2">
      <PairLine
        label="Король"
        accent
        male={playerMap.get(round.king_male_id)}
        female={playerMap.get(round.king_female_id)}
        phase={phase}
        settings={settings}
      />
      <PairLine
        label="Претендент 1"
        male={playerMap.get(round.c1_male_id)}
        female={playerMap.get(round.c1_female_id)}
        phase={phase}
        settings={settings}
      />
      <PairLine
        label="Претендент 2"
        male={playerMap.get(round.c2_male_id)}
        female={playerMap.get(round.c2_female_id)}
        phase={phase}
        settings={settings}
      />
    </div>
  );
}

function PairLine({
  label,
  male,
  female,
  accent,
  phase,
  settings,
}: {
  label: string;
  male: Player | undefined;
  female: Player | undefined;
  accent?: boolean;
  phase: Phase;
  settings: SideoutMixtSettings;
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        accent
          ? "border-orange-400/40 bg-orange-500/10"
          : "border-white/10 bg-white/[0.03]"
      }`}
    >
      <p
        className={`mb-1 text-[10px] font-bold uppercase tracking-widest ${
          accent ? "text-orange-300" : "text-slate-400"
        }`}
      >
        {label}
      </p>
      <p className="text-sm font-semibold text-slate-100">
        {male?.name ?? "—"}{" "}
        <span className="text-blue-300">
          {male ? playerSlotLabel(male, phase, settings) : "?"}
        </span>
        <span className="mx-2 text-slate-500">·</span>
        {female?.name ?? "—"}{" "}
        <span className="text-pink-300">
          {female ? playerSlotLabel(female, phase, settings) : "?"}
        </span>
      </p>
    </div>
  );
}

function PreStartView({
  round,
}: {
  tournament: Tournament;
  round: RoundState;
}) {
  const { dispatchRound } = useTournament();
  const [period, setPeriod] = useState<number>(
    round.period_minutes ?? PERIOD_DEFAULT_MINUTES,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function adjustPeriod(value: number) {
    const clamped = Math.max(
      PERIOD_MIN_MINUTES,
      Math.min(PERIOD_MAX_MINUTES, value),
    );
    setPeriod(clamped);
    setError(null);
    try {
      setBusy(true);
      await dispatchRound({
        type: "set_period",
        roundId: round.id,
        minutes: clamped,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function start() {
    setError(null);
    try {
      setBusy(true);
      await dispatchRound({ type: "start", roundId: round.id });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
        Длительность тура
      </p>
      <div className="flex items-stretch gap-2.5">
        <button
          type="button"
          disabled={busy || period <= PERIOD_MIN_MINUTES}
          onClick={() => adjustPeriod(period - 1)}
          style={tapStyle}
          className="grid h-16 w-16 place-items-center rounded-xl border border-white/15 text-2xl font-black text-white transition disabled:opacity-40"
          aria-label="Минус минута"
        >
          −
        </button>
        <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-white/15 bg-[#0b1535]">
          <span className="text-3xl font-black tabular-nums text-orange-300">
            {period}
          </span>
          <span className="text-[10px] uppercase tracking-widest text-slate-500">
            минут
          </span>
        </div>
        <button
          type="button"
          disabled={busy || period >= PERIOD_MAX_MINUTES}
          onClick={() => adjustPeriod(period + 1)}
          style={tapStyle}
          className="grid h-16 w-16 place-items-center rounded-xl border border-white/15 text-2xl font-black text-white transition disabled:opacity-40"
          aria-label="Плюс минута"
        >
          +
        </button>
      </div>
      <p className="text-center text-[11px] text-slate-500">
        Можно менять от {PERIOD_MIN_MINUTES} до {PERIOD_MAX_MINUTES} минут
      </p>

      {error && (
        <p className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={start}
        disabled={busy}
        style={tapStyle}
        className="h-16 w-full rounded-2xl bg-orange-500 text-base font-bold text-[#0b1535] transition active:scale-[0.99] disabled:opacity-60"
      >
        {busy ? "…" : "▶ Запустить тур"}
      </button>
    </div>
  );
}

function InProgressView({
  round,
}: {
  tournament: Tournament;
  round: RoundState;
}) {
  const { dispatchRound } = useTournament();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoFired, setAutoFired] = useState(false);
  const elapsed = useElapsedSeconds(round);
  const total = (round.period_minutes ?? PERIOD_DEFAULT_MINUTES) * 60;
  const remaining = Math.max(0, total - elapsed);
  const expired = remaining === 0;

  async function finish() {
    setError(null);
    try {
      setBusy(true);
      await dispatchRound({ type: "finish", roundId: round.id });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (expired && !autoFired && !busy) {
      setAutoFired(true);
      finish();
    }
  }, [expired, autoFired, busy]);

  useEffect(() => {
    setAutoFired(false);
  }, [round.id]);

  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;
  const pct = 100 - (remaining / total) * 100;

  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
      <div
        className={`text-center text-7xl font-black tabular-nums leading-none ${
          remaining < 60 ? "text-rose-300" : "text-orange-300"
        }`}
      >
        {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
        <div
          className={`h-full rounded-full transition-[width] duration-1000 ease-linear ${
            remaining < 60 ? "bg-rose-400" : "bg-orange-400"
          }`}
          style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
        />
      </div>

      {error && (
        <p className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={finish}
        disabled={busy}
        style={tapStyle}
        className="h-16 w-full rounded-2xl border-2 border-rose-400/40 bg-rose-500/10 text-base font-bold uppercase tracking-wide text-rose-200 transition active:scale-[0.99] disabled:opacity-60"
      >
        {busy ? "…" : "■ Завершить тур"}
      </button>
    </div>
  );
}

function ScoreEntryView({
  tournament,
  round,
  playerMap,
  phase,
  onSaved,
}: {
  tournament: Tournament;
  round: RoundState;
  playerMap: Map<string, Player>;
  phase: Phase;
  onSaved: () => void;
}) {
  const { dispatchRound } = useTournament();
  const ids = roundPlayerIds(round);

  const [drafts, setDrafts] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const id of ids) {
      init[id] = "";
    }
    return init;
  });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setValue(id: string, raw: string) {
    const cleaned = raw.replace(/[^\d]/g, "").slice(0, 2);
    setDrafts((prev) => ({ ...prev, [id]: cleaned }));
  }

  async function submit() {
    setBusy(true);
    setError(null);
    const points: Record<string, number> = {};
    for (const id of ids) {
      const n = Number(drafts[id] || "0");
      points[id] = Number.isInteger(n) && n >= 0 && n <= 99 ? n : 0;
    }
    try {
      await dispatchRound({
        type: "submit_scores",
        roundId: round.id,
        points,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
      <p className="text-base font-bold">Введите очки</p>

      <PairScoreBlock
        label="Король"
        accent
        male={playerMap.get(round.king_male_id)}
        female={playerMap.get(round.king_female_id)}
        drafts={drafts}
        onChange={setValue}
        phase={phase}
        settings={tournament.settings}
      />
      <PairScoreBlock
        label="Претендент 1"
        male={playerMap.get(round.c1_male_id)}
        female={playerMap.get(round.c1_female_id)}
        drafts={drafts}
        onChange={setValue}
        phase={phase}
        settings={tournament.settings}
      />
      <PairScoreBlock
        label="Претендент 2"
        male={playerMap.get(round.c2_male_id)}
        female={playerMap.get(round.c2_female_id)}
        drafts={drafts}
        onChange={setValue}
        phase={phase}
        settings={tournament.settings}
      />

      <p className="text-center text-xs text-slate-500">
        Очки набирает только пара на королевской стороне
      </p>

      {error && (
        <p className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={busy}
        style={tapStyle}
        className="h-16 w-full rounded-2xl bg-orange-500 text-base font-bold text-[#0b1535] transition active:scale-[0.99] disabled:opacity-60"
      >
        {busy ? "Сохраняем…" : "Сохранить и перейти к следующему туру"}
      </button>
    </div>
  );
}

function PairScoreBlock({
  label,
  male,
  female,
  drafts,
  onChange,
  accent,
  phase,
  settings,
}: {
  label: string;
  male: Player | undefined;
  female: Player | undefined;
  drafts: Record<string, string>;
  onChange: (id: string, raw: string) => void;
  accent?: boolean;
  phase: Phase;
  settings: SideoutMixtSettings;
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        accent
          ? "border-orange-400/40 bg-orange-500/10"
          : "border-white/10 bg-white/[0.03]"
      }`}
    >
      <p
        className={`mb-2 text-[10px] font-bold uppercase tracking-widest ${
          accent ? "text-orange-300" : "text-slate-400"
        }`}
      >
        {label}
      </p>
      {male && (
        <PlayerScoreRow
          player={male}
          value={drafts[male.id] ?? ""}
          onChange={(v) => onChange(male.id, v)}
          phase={phase}
          settings={settings}
        />
      )}
      {female && (
        <div className="mt-2">
          <PlayerScoreRow
            player={female}
            value={drafts[female.id] ?? ""}
            onChange={(v) => onChange(female.id, v)}
            phase={phase}
            settings={settings}
          />
        </div>
      )}
    </div>
  );
}

function PlayerScoreRow({
  player,
  value,
  onChange,
  phase,
  settings,
}: {
  player: Player;
  value: string;
  onChange: (raw: string) => void;
  phase: Phase;
  settings: SideoutMixtSettings;
}) {
  return (
    <label className="flex items-center gap-3">
      <span className="min-w-0 flex-1 truncate text-sm font-semibold">
        {player.name}{" "}
        <span
          className={`ml-1 text-xs ${
            player.gender === "male" ? "text-blue-300" : "text-pink-300"
          }`}
        >
          {playerSlotLabel(player, phase, settings)}
        </span>
      </span>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        style={tapStyle}
        className="h-12 w-20 rounded-xl border border-white/15 bg-[#0b1535] text-center text-xl font-black tabular-nums text-orange-300 outline-none focus:border-orange-400"
      />
    </label>
  );
}

function CompletedView({
  tournament,
  round,
  playerMap,
  phase,
  onAdvance,
}: {
  tournament: Tournament;
  round: RoundState;
  playerMap: Map<string, Player>;
  phase: Phase;
  onAdvance: () => void;
}) {
  const { dispatchRound } = useTournament();
  const [busy, setBusy] = useState(false);
  const isLast = round.round_number === 3;

  async function reset() {
    if (!confirm("Сбросить тур? Очки будут удалены.")) return;
    setBusy(true);
    try {
      await dispatchRound({ type: "reset", roundId: round.id });
    } finally {
      setBusy(false);
    }
  }

  async function reopen() {
    if (!confirm("Вернуться к вводу очков?")) return;
    setBusy(true);
    try {
      await dispatchRound({ type: "finish", roundId: round.id });
    } finally {
      setBusy(false);
    }
  }

  const ids = roundPlayerIds(round);
  const roundPlayers = ids
    .map((id) => playerMap.get(id))
    .filter((p): p is Player => Boolean(p));
  const malesSorted = roundPlayers
    .filter((p) => p.gender === "male")
    .sort((a, b) => readPoints(round, b.id) - readPoints(round, a.id));
  const femalesSorted = roundPlayers
    .filter((p) => p.gender === "female")
    .sort((a, b) => readPoints(round, b.id) - readPoints(round, a.id));

  return (
    <div className="space-y-4 rounded-2xl border border-emerald-400/30 bg-emerald-500/[0.06] p-4 sm:p-5">
      <p className="text-sm font-bold text-emerald-300">Тур завершён</p>

      <RoundResultGroup
        title="Мужчины"
        players={malesSorted}
        round={round}
        phase={phase}
        settings={tournament.settings}
      />
      <RoundResultGroup
        title="Женщины"
        players={femalesSorted}
        round={round}
        phase={phase}
        settings={tournament.settings}
      />

      {!isLast && (
        <button
          type="button"
          onClick={onAdvance}
          style={tapStyle}
          className="h-12 w-full rounded-xl bg-orange-500 text-sm font-bold text-[#0b1535] transition active:scale-[0.99]"
        >
          Перейти к туру {round.round_number + 1} →
        </button>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={reopen}
          disabled={busy}
          style={tapStyle}
          className="h-10 flex-1 rounded-xl border border-white/15 text-xs font-semibold text-slate-300 disabled:opacity-50"
        >
          Изменить очки
        </button>
        <button
          type="button"
          onClick={reset}
          disabled={busy}
          style={tapStyle}
          className="h-10 flex-1 rounded-xl border border-rose-400/30 text-xs font-semibold text-rose-300 disabled:opacity-50"
        >
          Сбросить тур
        </button>
      </div>
    </div>
  );
}

function RoundResultGroup({
  title,
  players,
  round,
  phase,
  settings,
}: {
  title: string;
  players: Player[];
  round: RoundState;
  phase: Phase;
  settings: SideoutMixtSettings;
}) {
  if (players.length === 0) return null;
  return (
    <div>
      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
        {title} · {players.length}
      </p>
      <ul className="space-y-1.5">
        {players.map((p, i) => {
          const pts = readPoints(round, p.id);
          return (
            <li
              key={p.id}
              className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.04] px-3 py-2"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-white/10 text-[11px] font-bold tabular-nums text-slate-300">
                  {i + 1}
                </span>
                <span className="truncate text-sm font-semibold">{p.name}</span>
                <span
                  className={`text-xs ${
                    p.gender === "male" ? "text-blue-300" : "text-pink-300"
                  }`}
                >
                  {playerSlotLabel(p, phase, settings)}
                </span>
              </span>
              <span className="text-base font-black tabular-nums text-orange-300">
                {pts}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function StatusBadge({ status }: { status: RoundState["status"] }) {
  const cfg: Record<
    RoundState["status"],
    { cls: string; label: string }
  > = {
    scheduled: {
      cls: "bg-white/5 text-slate-300 ring-white/10",
      label: "ждёт старта",
    },
    in_progress: {
      cls: "bg-orange-500/15 text-orange-300 ring-orange-400/30",
      label: "идёт",
    },
    awaiting_scores: {
      cls: "bg-amber-500/15 text-amber-300 ring-amber-400/30",
      label: "ввод очков",
    },
    completed: {
      cls: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30",
      label: "сыгран",
    },
  };
  const { cls, label } = cfg[status];
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ring-1 ${cls}`}
    >
      {label}
    </span>
  );
}

function useElapsedSeconds(round: RoundState): number {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    if (round.status !== "in_progress") return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [round.status, round.id]);

  if (!round.started_at) return 0;
  const start = new Date(round.started_at).getTime();
  const fallbackEnd = round.finished_at
    ? new Date(round.finished_at).getTime()
    : start;
  const end =
    round.status === "in_progress" ? (now ?? fallbackEnd) : fallbackEnd;
  return Math.max(0, Math.floor((end - start) / 1000));
}

type Standing = {
  player: Player;
  total: number;
};

function aggregateStandings(
  players: Player[],
  rounds: RoundState[],
): Standing[] {
  const totals = new Map<string, number>();
  for (const r of rounds) {
    for (const [pid, n] of Object.entries(r.points_by_player ?? {})) {
      totals.set(pid, (totals.get(pid) ?? 0) + (Number(n) || 0));
    }
  }
  return players.map((p) => ({
    player: p,
    total: totals.get(p.id) ?? 0,
  }));
}

function StandingsTab({
  tournament,
  playerMap,
  phase,
}: {
  tournament: Tournament;
  playerMap: Map<string, Player>;
  phase: Phase;
}) {
  if (phase === "qualification") {
    return <QualificationStandings tournament={tournament} />;
  }
  if (phase === "leagues") {
    return <LeaguesStandings tournament={tournament} />;
  }
  return <AwardsScreen tournament={tournament} playerMap={playerMap} />;
}

function QualificationStandings({ tournament }: { tournament: Tournament }) {
  const { dispatchPhase, forcePhase } = useTournament();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const qrounds = tournament.settings.rounds.filter(
    (r) => (r.phase ?? "qualification") === "qualification",
  );
  const allDone =
    qrounds.length > 0 && qrounds.every((r) => r.status === "completed");

  async function forceLeaguesPhase() {
    await forcePhase("leagues");
  }

  const standings = useMemo(
    () => aggregateStandings(tournament.settings.players, qrounds),
    [tournament.settings.players, qrounds],
  );
  const males = useMemo(
    () =>
      [...standings.filter((s) => s.player.gender === "male")].sort(
        (a, b) => b.total - a.total,
      ),
    [standings],
  );
  const females = useMemo(
    () =>
      [...standings.filter((s) => s.player.gender === "female")].sort(
        (a, b) => b.total - a.total,
      ),
    [standings],
  );

  async function finalize() {
    if (
      !confirm(
        "Подтвердить распределение и начать лиги? После этого изменить квалификацию нельзя из этого экрана.",
      )
    )
      return;
    setBusy(true);
    setError(null);
    console.log("[tournament] finalize_qualification: dispatch start");
    try {
      await dispatchPhase({ type: "finalize_qualification" });
      console.log("[tournament] phase changed to leagues");
    } catch (err) {
      console.error("[tournament] finalize_qualification failed:", err);
      try {
        await forceLeaguesPhase();
        console.log(
          "[tournament] phase changed to leagues (fallback after error)",
        );
      } catch (forceErr) {
        console.error("[tournament] force fallback also failed:", forceErr);
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-orange-400/30 bg-orange-500/10 p-3">
        <p className="text-xs font-bold uppercase tracking-widest text-orange-300">
          Этап 1 · Квалификация
        </p>
        <p className="mt-1 text-xs text-slate-300">
          {allDone
            ? "Все туры квалификации завершены. Можно подтвердить распределение."
            : `Завершено туров: ${qrounds.filter((r) => r.status === "completed").length} из ${qrounds.length}`}
        </p>
      </div>

      <DivisionedTable
        gender="male"
        title="Мужчины"
        rows={males}
        topN={3}
      />
      <DivisionedTable
        gender="female"
        title="Женщины"
        rows={females}
        topN={3}
      />

      <p className="text-center text-xs text-slate-500">
        TOP-3 по очкам — HARD, остальные — LIGHT
      </p>

      {error && (
        <p className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={finalize}
        disabled={!allDone || busy}
        style={tapStyle}
        className="h-16 w-full rounded-2xl bg-orange-500 text-base font-bold text-[#0b1535] transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "…" : "Подтвердить распределение и начать лиги"}
      </button>
    </div>
  );
}

function LeaguesStandings({ tournament }: { tournament: Tournament }) {
  const { dispatchPhase } = useTournament();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const leagueRounds = tournament.settings.rounds.filter(
    (r) => r.phase === "hard" || r.phase === "light",
  );
  const allDone =
    leagueRounds.length > 0 &&
    leagueRounds.every((r) => r.status === "completed");

  async function finalize() {
    if (!confirm("Завершить турнир? После этого изменения невозможны.")) return;
    setBusy(true);
    setError(null);
    try {
      await dispatchPhase({ type: "finalize_tournament" });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-orange-400/30 bg-orange-500/10 p-3">
        <p className="text-xs font-bold uppercase tracking-widest text-orange-300">
          Этап 2 · Лиги
        </p>
        <p className="mt-1 text-xs text-slate-300">
          {allDone
            ? "Все туры лиг завершены. Можно завершить турнир."
            : `Завершено туров: ${leagueRounds.filter((r) => r.status === "completed").length} из ${leagueRounds.length}`}
        </p>
      </div>

      <LeagueStandingsBlock tournament={tournament} league="hard" />
      <LeagueStandingsBlock tournament={tournament} league="light" />

      {error && (
        <p className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={finalize}
        disabled={!allDone || busy}
        style={tapStyle}
        className="h-16 w-full rounded-2xl bg-orange-500 text-base font-bold text-[#0b1535] transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "…" : "🏁 Завершить турнир"}
      </button>
    </div>
  );
}

function LeagueStandingsBlock({
  tournament,
  league,
}: {
  tournament: Tournament;
  league: League;
}) {
  const playersInLeague = tournament.settings.players.filter(
    (p) => tournament.settings.league_slots?.[p.id]?.league === league,
  );
  const rounds = tournament.settings.rounds.filter((r) => r.phase === league);
  const standings = useMemo(
    () => aggregateStandings(playersInLeague, rounds),
    [playersInLeague, rounds],
  );
  const males = [...standings.filter((s) => s.player.gender === "male")].sort(
    (a, b) => b.total - a.total,
  );
  const females = [...standings.filter((s) => s.player.gender === "female")].sort(
    (a, b) => b.total - a.total,
  );

  return (
    <section className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
      <h3 className="text-base font-black uppercase tracking-wider text-orange-300">
        {LEAGUE_LABEL[league]} · Корт{" "}
        {league === "hard" ? "1" : "2"}
      </h3>
      <SimpleTable gender="male" title="Мужчины" rows={males} />
      <SimpleTable gender="female" title="Женщины" rows={females} />
    </section>
  );
}

function DivisionedTable({
  gender,
  title,
  rows,
  topN,
}: {
  gender: Gender;
  title: string;
  rows: Standing[];
  topN: number;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wide text-orange-300">
          {title}
        </h3>
        <span className="text-[10px] uppercase tracking-widest text-slate-500">
          {rows.length} игроков
        </span>
      </div>
      <div className="-mx-3 overflow-x-auto px-3 sm:mx-0 sm:px-0">
        <table className="w-full min-w-[420px] text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-widest text-slate-500">
              <th className="pb-2 pr-2">#</th>
              <th className="pb-2 pr-2">Игрок</th>
              <th className="pb-2 pr-2 text-right">Очки</th>
              <th className="pb-2 text-right">Дивизион</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const isHard = i < topN;
              return (
                <tr key={row.player.id} className="border-t border-white/5">
                  <td className="py-2 pr-2 font-bold tabular-nums text-slate-500">
                    {i + 1}
                  </td>
                  <td className="py-2 pr-2">
                    <span className="font-semibold">{row.player.name}</span>
                  </td>
                  <td className="py-2 pr-2 text-right text-base font-black tabular-nums text-orange-300">
                    {row.total}
                  </td>
                  <td className="py-2 text-right">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ring-1 ${
                        isHard
                          ? "bg-orange-500/15 text-orange-300 ring-orange-400/30"
                          : "bg-blue-500/15 text-blue-200 ring-blue-400/30"
                      }`}
                    >
                      {isHard ? "Hard" : "Light"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {gender === "female" && null}
    </section>
  );
}

function SimpleTable({
  gender,
  title,
  rows,
}: {
  gender: Gender;
  title: string;
  rows: Standing[];
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">
        {title} · {rows.length}
      </p>
      <ul className="space-y-1.5">
        {rows.map((row, i) => (
          <li
            key={row.player.id}
            className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.04] px-3 py-2"
          >
            <span className="flex items-center gap-2 text-sm">
              <span className="grid h-6 w-6 place-items-center rounded-md bg-white/10 text-[11px] font-bold tabular-nums text-slate-300">
                {i + 1}
              </span>
              <span className="font-semibold">{row.player.name}</span>
              <span
                className={`text-xs ${gender === "male" ? "text-blue-300" : "text-pink-300"}`}
              >
                {gender === "male" ? "М" : "Ж"}
              </span>
            </span>
            <span className="text-base font-black tabular-nums text-orange-300">
              {row.total}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AwardsScreen({
  tournament,
  playerMap,
}: {
  tournament: Tournament;
  playerMap: Map<string, Player>;
}) {
  const { dispatchPhase } = useTournament();
  const [busy, setBusy] = useState(false);

  async function reopen() {
    if (!confirm("Вернуться к этапу лиг? Статус турнира станет активным."))
      return;
    setBusy(true);
    try {
      await dispatchPhase({ type: "reset_to_qualification" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-orange-400/40 bg-gradient-to-br from-orange-500/20 via-orange-500/10 to-blue-500/10 p-6 text-center">
        <p className="text-5xl">🏆</p>
        <p className="mt-2 text-xl font-black tracking-wide">
          {tournament.title}
        </p>
        <p className="mt-1 text-xs uppercase tracking-widest text-slate-300">
          Турнир завершён
        </p>
      </div>

      <PodiumBlock tournament={tournament} playerMap={playerMap} league="hard" />
      <PodiumBlock tournament={tournament} playerMap={playerMap} league="light" />

      <button
        type="button"
        onClick={reopen}
        disabled={busy}
        style={tapStyle}
        className="h-10 w-full rounded-xl border border-white/15 text-xs font-semibold text-slate-300 disabled:opacity-50"
      >
        Сбросить турнир к квалификации
      </button>
    </div>
  );
}

function PodiumBlock({
  tournament,
  playerMap,
  league,
}: {
  tournament: Tournament;
  playerMap: Map<string, Player>;
  league: League;
}) {
  const playersInLeague = tournament.settings.players.filter(
    (p) => tournament.settings.league_slots?.[p.id]?.league === league,
  );
  const rounds = tournament.settings.rounds.filter((r) => r.phase === league);
  const standings = aggregateStandings(playersInLeague, rounds);
  const males = [...standings.filter((s) => s.player.gender === "male")].sort(
    (a, b) => b.total - a.total,
  );
  const females = [...standings.filter((s) => s.player.gender === "female")].sort(
    (a, b) => b.total - a.total,
  );

  return (
    <section
      className={`space-y-4 rounded-3xl border p-5 ${
        league === "hard"
          ? "border-orange-400/40 bg-orange-500/[0.06]"
          : "border-blue-400/30 bg-blue-500/[0.06]"
      }`}
    >
      <h3
        className={`text-xl font-black uppercase tracking-wider ${
          league === "hard" ? "text-orange-300" : "text-blue-200"
        }`}
      >
        {LEAGUE_LABEL[league]}
      </h3>

      <Podium gender="male" title="Мужчины" rows={males} />
      <Podium gender="female" title="Женщины" rows={females} />
    </section>
  );
}

const MEDALS = ["🥇", "🥈", "🥉"];

function Podium({
  gender,
  title,
  rows,
}: {
  gender: Gender;
  title: string;
  rows: Standing[];
}) {
  return (
    <div>
      <p
        className={`mb-2 text-xs font-bold uppercase tracking-widest ${
          gender === "male" ? "text-blue-300" : "text-pink-300"
        }`}
      >
        {title}
      </p>
      <ul className="space-y-2">
        {rows.slice(0, 3).map((row, i) => (
          <li
            key={row.player.id}
            className={`flex items-center gap-3 rounded-2xl border p-3 ${
              i === 0
                ? "border-orange-400/50 bg-orange-500/15"
                : i === 1
                  ? "border-white/15 bg-white/[0.06]"
                  : "border-white/10 bg-white/[0.03]"
            }`}
          >
            <span className="text-3xl">{MEDALS[i]}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-base font-bold">
                {row.player.name}
              </span>
              <span className="block text-[11px] uppercase tracking-widest text-slate-400">
                {i === 0 ? "победитель" : i === 1 ? "2 место" : "3 место"}
              </span>
            </span>
            <span className="text-2xl font-black tabular-nums text-orange-300">
              {row.total}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
