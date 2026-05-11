"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import {
  generateLocalTournamentId,
  saveTournamentState,
  deleteTournamentState,
} from "@/lib/offline";
import { buildTournament } from "@/lib/tournament-actions";

type Gender = "male" | "female";
type Player = { name: string; gender: Gender };
type Phase = "roster" | "drawing" | "preview";

type AnimVars = {
  "--x1": string;
  "--y1": string;
  "--r1": string;
  "--s1": string;
  "--x2": string;
  "--y2": string;
  "--r2": string;
  "--s2": string;
  "--x3": string;
  "--y3": string;
  "--r3": string;
  "--s3": string;
  "--x4": string;
  "--y4": string;
  "--r4": string;
  "--s4": string;
};

const MAX_PLAYERS = 12;
const MAX_PER_GENDER = 6;
const SHUFFLE_DURATION = 3400;

const tapStyle = {
  touchAction: "manipulation" as const,
  userSelect: "none" as const,
  WebkitUserSelect: "none" as const,
  WebkitTapHighlightColor: "transparent",
};

function rnd(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function shuffleArr<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function makeAnimVars(): AnimVars {
  const sign = () => (Math.random() < 0.5 ? -1 : 1);
  const dist = () => `${sign() * rnd(20, 55)}vw`;
  const distY = () => `${sign() * rnd(20, 45)}vh`;
  const rot = () => `${sign() * rnd(30, 220)}deg`;
  const scale = () => rnd(0.55, 1.1).toFixed(2);
  return {
    "--x1": dist(),
    "--y1": distY(),
    "--r1": rot(),
    "--s1": scale(),
    "--x2": dist(),
    "--y2": distY(),
    "--r2": rot(),
    "--s2": scale(),
    "--x3": dist(),
    "--y3": distY(),
    "--r3": rot(),
    "--s3": scale(),
    "--x4": dist(),
    "--y4": distY(),
    "--r4": rot(),
    "--s4": scale(),
  };
}

export default function CreateTournamentPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("roster");
  const [title, setTitle] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [name, setName] = useState("");
  const [gender, setGender] = useState<Gender | null>(null);

  const [shuffled, setShuffled] = useState<Player[]>([]);
  const [shuffleNonce, setShuffleNonce] = useState(0);
  const [animVars, setAnimVars] = useState<Record<number, AnimVars>>({});

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const males = players.filter((p) => p.gender === "male");
  const females = players.filter((p) => p.gender === "female");
  const maleQuotaFull = males.length >= MAX_PER_GENDER;
  const femaleQuotaFull = females.length >= MAX_PER_GENDER;
  const rosterFull = players.length >= MAX_PLAYERS;
  const canAdd =
    name.trim().length > 0 &&
    gender !== null &&
    !rosterFull &&
    !(gender === "male" && maleQuotaFull) &&
    !(gender === "female" && femaleQuotaFull);
  const canDraw =
    title.trim().length > 0 &&
    males.length === MAX_PER_GENDER &&
    females.length === MAX_PER_GENDER;

  function addPlayer() {
    if (!canAdd || !gender) return;
    setPlayers((prev) => [...prev, { name: name.trim(), gender }]);
    setName("");
    setGender(null);
  }

  function removePlayer(index: number) {
    setPlayers((prev) => prev.filter((_, i) => i !== index));
  }

  function startDraw() {
    if (!canDraw) return;
    const shuffledMales = shuffleArr(males);
    const shuffledFemales = shuffleArr(females);
    const order = [...shuffledMales, ...shuffledFemales];
    const vars: Record<number, AnimVars> = {};
    for (let i = 0; i < order.length; i++) vars[i] = makeAnimVars();
    setShuffled(order);
    setAnimVars(vars);
    setShuffleNonce((n) => n + 1);
    setPhase("drawing");
  }

  function reshuffle() {
    startDraw();
  }

  async function commit() {
    if (busy) return;
    setBusy(true);
    setError("");

    console.log("START: creating tournament");
    console.log("players:", players);
    console.log("draw:", shuffled);

    try {
      // Step 1: build complete tournament locally with a temporary local id.
      const localTournament = buildTournament(
        title.trim(),
        shuffled,
        generateLocalTournamentId(),
      );
      console.log("built local tournament:", localTournament.id);

      // Step 2: save to IDB immediately so it survives offline / reload.
      await saveTournamentState(localTournament.id, localTournament);
      console.log("saved to IndexedDB");

      // Step 3: if offline, redirect to local id and stop.
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        const tournamentId = localTournament.id;
        console.log("offline — redirecting to:", tournamentId);
        router.push(`/tournaments/${tournamentId}`);
        return;
      }

      // Step 4: try server with a short timeout.
      // Network failures here are NOT errors — we fall back to local copy.
      let tournamentId = localTournament.id;
      let serverAccepted = false;
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 8000);
        const res = await fetch("/api/tournaments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: title.trim(), players: shuffled }),
          signal: ctrl.signal,
        });
        clearTimeout(t);
        const data = (await res.json().catch(() => ({}))) as {
          tournament?: { id: string };
          error?: string;
        };
        console.log("server response:", res.status, data);
        if (!res.ok || !data.tournament?.id) {
          throw new Error(data.error ?? `HTTP ${res.status}`);
        }

        // Server accepted: migrate IDB key from local- to server uuid.
        const serverTournament = {
          ...localTournament,
          id: data.tournament.id,
        };
        await saveTournamentState(serverTournament.id, serverTournament);
        await deleteTournamentState(localTournament.id);
        tournamentId = serverTournament.id;
        serverAccepted = true;
        console.log("migrated local to server:", tournamentId);
      } catch (netErr) {
        console.warn(
          "[create] server step failed — keeping local copy:",
          netErr,
        );
      }

      console.log(
        "redirecting to:",
        tournamentId,
        serverAccepted ? "(server)" : "(local)",
      );
      router.push(`/tournaments/${tournamentId}`);
    } catch (e) {
      console.error("[create] commit failed:", e);
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  if (phase === "drawing" || phase === "preview") {
    return (
      <DrawScreen
        key={shuffleNonce}
        title={title}
        shuffled={shuffled}
        animVars={animVars}
        animating={phase === "drawing"}
        busy={busy}
        error={error}
        onAnimationEnd={() => setPhase("preview")}
        onReshuffle={reshuffle}
        onCommit={commit}
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-[#0b1535] text-slate-100">
      <header className="border-b border-white/5">
        <div className="mx-auto flex w-full max-w-lg items-center justify-between px-4 py-3 sm:px-6">
          <a href="/" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-orange-500 font-black text-[#0b1535]">
              V
            </span>
            <span className="text-base font-bold">
              Volley<span className="text-orange-400">72</span>
            </span>
          </a>
          <a href="/" className="text-xs text-slate-300">
            ← На главную
          </a>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6 sm:px-6">
        <h1 className="text-2xl font-bold">Новый турнир</h1>
        <p className="mt-1 text-xs text-slate-400">
          SideOut Mixt · 12 игроков · 2 корта · 3 тура
        </p>

        <label className="mt-6 block">
          <span className="mb-2 block text-xs uppercase tracking-wide text-slate-400">
            Название турнира
          </span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="SideOut Mixt — 10 мая"
            className="h-12 w-full rounded-xl border border-white/15 bg-[#1a2a55] px-4 text-base text-white outline-none transition focus:border-orange-400"
          />
        </label>

        <section className="mt-5 rounded-2xl bg-[#1a2a55] p-4">
          <p className="mb-3 text-xs text-slate-400 tabular-nums">
            Игроков: {players.length}/{MAX_PLAYERS} · М: {males.length}/
            {MAX_PER_GENDER} · Ж: {females.length}/{MAX_PER_GENDER}
          </p>

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addPlayer();
              }
            }}
            placeholder="Имя игрока"
            autoComplete="off"
            className="h-12 w-full rounded-xl border border-white/15 bg-[#0b1535] px-4 text-base text-white outline-none transition focus:border-orange-400"
          />

          <div className="mt-3 flex gap-2.5">
            <button
              type="button"
              onPointerDown={() => setGender("male")}
              disabled={maleQuotaFull}
              aria-pressed={gender === "male"}
              style={tapStyle}
              className={`h-14 flex-1 rounded-xl border-2 text-lg font-bold transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 ${
                gender === "male"
                  ? "border-orange-500 bg-orange-500 text-white"
                  : "border-white/15 bg-[#0b1535] text-white"
              }`}
            >
              М
            </button>
            <button
              type="button"
              onPointerDown={() => setGender("female")}
              disabled={femaleQuotaFull}
              aria-pressed={gender === "female"}
              style={tapStyle}
              className={`h-14 flex-1 rounded-xl border-2 text-lg font-bold transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 ${
                gender === "female"
                  ? "border-orange-500 bg-orange-500 text-white"
                  : "border-white/15 bg-[#0b1535] text-white"
              }`}
            >
              Ж
            </button>
          </div>

          <button
            type="button"
            onClick={addPlayer}
            disabled={!canAdd}
            style={tapStyle}
            className={`mt-3 h-12 w-full rounded-xl text-base font-bold transition ${
              canAdd
                ? "bg-orange-500 text-white"
                : "cursor-not-allowed bg-white/10 text-slate-500"
            }`}
          >
            + Добавить игрока
          </button>
        </section>

        {players.length > 0 && (
          <div className="mt-5 space-y-4">
            {(["male", "female"] as Gender[]).map((g) => {
              const list = players.filter((p) => p.gender === g);
              if (list.length === 0) return null;
              return (
                <div key={g}>
                  <p className="mb-2 text-xs text-slate-400">
                    {g === "male" ? "👨 Мужчины" : "👩 Женщины"} · {list.length}
                  </p>
                  <ul className="space-y-1.5">
                    {list.map((p) => {
                      const idx = players.indexOf(p);
                      return (
                        <li
                          key={idx}
                          className="flex items-center justify-between rounded-lg bg-[#1a2a55] px-3.5 py-2.5"
                        >
                          <span className="text-[15px]">{p.name}</span>
                          <button
                            type="button"
                            onClick={() => removePlayer(idx)}
                            aria-label="Удалить"
                            style={tapStyle}
                            className="px-1 text-lg text-orange-400"
                          >
                            ×
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        )}

        {canDraw ? (
          <button
            type="button"
            onClick={startDraw}
            disabled={busy}
            style={tapStyle}
            className="mt-6 h-16 w-full rounded-2xl bg-orange-500 text-base font-black uppercase tracking-wide text-[#0b1535] shadow-lg shadow-orange-500/30 transition active:scale-[0.99]"
          >
            🎲 Провести жеребьёвку
          </button>
        ) : (
          players.length > 0 && (
            <p className="mt-5 text-center text-sm text-slate-400">
              {(() => {
                const needM = Math.max(0, MAX_PER_GENDER - males.length);
                const needF = Math.max(0, MAX_PER_GENDER - females.length);
                const titleNeed = title.trim() === "";
                const parts: string[] = [];
                if (needM > 0)
                  parts.push(`ещё ${needM} ${pluralRu(needM, "мужчину", "мужчин", "мужчин")}`);
                if (needF > 0)
                  parts.push(`ещё ${needF} ${pluralRu(needF, "женщину", "женщины", "женщин")}`);
                const tail = titleNeed ? " · введите название" : "";
                if (parts.length === 0) return `Введите название${tail}`;
                return `Нужно: ${parts.join(" и ")}${tail}`;
              })()}
            </p>
          )
        )}
      </main>
    </div>
  );
}

function DrawScreen({
  title,
  shuffled,
  animVars,
  animating,
  busy,
  error,
  onAnimationEnd,
  onReshuffle,
  onCommit,
}: {
  title: string;
  shuffled: Player[];
  animVars: Record<number, AnimVars>;
  animating: boolean;
  busy: boolean;
  error: string;
  onAnimationEnd: () => void;
  onReshuffle: () => void;
  onCommit: () => void;
}) {
  useEffect(() => {
    if (!animating) return;
    const t = setTimeout(onAnimationEnd, SHUFFLE_DURATION);
    return () => clearTimeout(t);
  }, [animating, onAnimationEnd]);

  // Final positions: males[0..2]=court1 slots 1-3; males[3..5]=court2 slots 1-3
  // Same for females. Indices in shuffled: males 0-5, females 6-11.
  const placement = shuffled.map((p, i) => {
    const isMale = i < 6;
    const withinGender = isMale ? i : i - 6;
    const court: 1 | 2 = withinGender < 3 ? 1 : 2;
    const slot = ((withinGender % 3) + 1) as 1 | 2 | 3;
    return { player: p, court, slot, srcIndex: i };
  });

  const court1 = placement
    .filter((x) => x.court === 1)
    .sort((a, b) => (a.player.gender === b.player.gender ? a.slot - b.slot : a.player.gender === "male" ? -1 : 1));
  const court2 = placement
    .filter((x) => x.court === 2)
    .sort((a, b) => (a.player.gender === b.player.gender ? a.slot - b.slot : a.player.gender === "male" ? -1 : 1));

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-[#0b1535] text-slate-100"
      style={{ backgroundImage: "radial-gradient(circle at 50% 0%, rgba(249,115,22,0.18), transparent 60%)" }}
    >
      <div className="px-4 pt-6 text-center sm:pt-10">
        <p className="text-[11px] uppercase tracking-[0.4em] text-orange-300">
          Жеребьёвка
        </p>
        <p className="mt-1 truncate text-xl font-black sm:text-2xl">
          {title || "SideOut Mixt"}
        </p>
        <p
          className={`mt-2 text-sm font-medium transition ${
            animating ? "text-orange-300" : "text-emerald-300"
          }`}
        >
          {animating
            ? "🎲 Перемешиваем игроков…"
            : "✨ Жеребьёвка завершена"}
        </p>
      </div>

      <div className="relative mt-4 flex flex-1 items-center justify-center px-3 sm:px-6">
        <div className="grid w-full max-w-md grid-cols-2 gap-3">
          <CourtColumn
            number={1}
            entries={court1}
            animating={animating}
            animVars={animVars}
          />
          <CourtColumn
            number={2}
            entries={court2}
            animating={animating}
            animVars={animVars}
          />
        </div>
      </div>

      <div className="px-4 pb-6 sm:pb-10">
        {error && (
          <p className="mb-3 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-center text-sm text-rose-200">
            {error}
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onReshuffle}
            disabled={animating || busy}
            style={tapStyle}
            className="h-14 rounded-2xl border-2 border-white/15 bg-white/[0.04] text-sm font-bold text-white transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
          >
            🔁 Перемешать снова
          </button>
          <button
            type="button"
            onClick={onCommit}
            disabled={animating || busy}
            style={tapStyle}
            className="h-14 rounded-2xl bg-orange-500 text-sm font-black text-[#0b1535] shadow-lg shadow-orange-500/30 transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Создаём…" : "🏁 Начать турнир"}
          </button>
        </div>
        <p
          className={`mt-3 text-center text-[11px] text-slate-500 transition ${
            animating ? "opacity-60" : "opacity-100"
          }`}
        >
          {animating
            ? "Анимация ~3 сек."
            : "Можно перемешать ещё или зафиксировать жеребьёвку"}
        </p>
      </div>
    </div>
  );
}

type Entry = {
  player: Player;
  court: 1 | 2;
  slot: 1 | 2 | 3;
  srcIndex: number;
};

function CourtColumn({
  number,
  entries,
  animating,
  animVars,
}: {
  number: 1 | 2;
  entries: Entry[];
  animating: boolean;
  animVars: Record<number, AnimVars>;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div
        className={`rounded-xl border-2 px-3 py-2 text-center font-black transition ${
          animating
            ? "border-white/10 bg-white/[0.03] text-slate-500"
            : "draw-court-pop border-orange-400/40 bg-orange-500/15 text-orange-300"
        }`}
        style={animating ? undefined : { animationDelay: `${SHUFFLE_DURATION}ms` }}
      >
        Корт {number}
      </div>
      {entries.map((e, idx) => (
        <DrawCard
          key={e.srcIndex}
          entry={e}
          animating={animating}
          vars={animVars[e.srcIndex]}
          landDelay={idx * 80}
        />
      ))}
    </div>
  );
}

function DrawCard({
  entry,
  animating,
  vars,
  landDelay,
}: {
  entry: Entry;
  animating: boolean;
  vars: AnimVars | undefined;
  landDelay: number;
}) {
  const isMale = entry.player.gender === "male";
  const slotLabel = isMale ? `М${entry.slot}` : `Ж${entry.slot}`;

  if (animating) {
    return (
      <div
        className={`draw-card-anim flex h-14 items-center gap-2 rounded-xl border-2 px-2.5 ${
          isMale
            ? "border-blue-400/60 bg-blue-500/20"
            : "border-pink-400/60 bg-pink-500/20"
        }`}
        style={{
          ...(vars as CSSProperties | undefined),
          animationDelay: `${(entry.srcIndex * 40) % 280}ms`,
        }}
      >
        <span
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-xs font-black ${
            isMale ? "bg-blue-500 text-white" : "bg-pink-500 text-white"
          }`}
        >
          {slotLabel}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-bold">
          {entry.player.name}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`draw-card-land flex h-14 items-center gap-2 rounded-xl border-2 px-2.5 opacity-0 ${
        isMale
          ? "border-blue-400/60 bg-blue-500/20"
          : "border-pink-400/60 bg-pink-500/20"
      }`}
      style={{ animationDelay: `${landDelay}ms` }}
    >
      <span
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-xs font-black ${
          isMale ? "bg-blue-500 text-white" : "bg-pink-500 text-white"
        }`}
      >
        {slotLabel}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-bold">
        {entry.player.name}
      </span>
    </div>
  );
}

function pluralRu(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
}
