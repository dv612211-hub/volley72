"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  DIRECTION_LABEL,
  DOMINANT_HAND_LABEL,
  GAME_FORMAT_LABEL,
  GENDER_LABEL,
  LEVEL_COLOR,
  LEVEL_LABEL,
  avatarInitials,
  type Direction,
  type PlayerGender,
  type PlayerLevel,
  type PublicPlayer,
} from "@/lib/player";

const tapStyle = {
  touchAction: "manipulation" as const,
  userSelect: "none" as const,
  WebkitUserSelect: "none" as const,
  WebkitTapHighlightColor: "transparent",
};

type GenderFilter = "all" | PlayerGender;
type LevelFilter = "all" | PlayerLevel;
type DirectionFilter = "all" | Direction;

export default function PlayersListPage() {
  const [players, setPlayers] = useState<PublicPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [genderFilter, setGenderFilter] = useState<GenderFilter>("all");
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("all");
  const [directionFilter, setDirectionFilter] =
    useState<DirectionFilter>("all");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/players")
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { players?: PublicPlayer[] };
        if (!cancelled) {
          setPlayers(data.players ?? []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(
    () =>
      players.filter((p) => {
        if (genderFilter !== "all" && p.gender !== genderFilter) return false;
        if (levelFilter !== "all" && p.level !== levelFilter) return false;
        if (directionFilter !== "all" && p.direction !== directionFilter)
          return false;
        return true;
      }),
    [players, genderFilter, levelFilter, directionFilter],
  );

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-[#0b1535] text-slate-100">
      <header className="sticky top-0 z-20 border-b border-white/5 bg-[#0b1535]/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-orange-500 font-black text-[#0b1535]">
              V
            </span>
            <span className="text-base font-bold">
              Volley<span className="text-orange-400">72</span>
            </span>
          </Link>
          <Link
            href="/players/create"
            style={tapStyle}
            className="rounded-full bg-orange-500 px-4 py-2 text-sm font-bold text-[#0b1535]"
          >
            + Добавить игрока
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          Игроки <span className="text-orange-400">Volley72</span>
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          {loading ? "…" : `${filtered.length} из ${players.length}`}
        </p>

        <section className="mt-5 space-y-3">
          <FilterRow
            label="Пол"
            value={genderFilter}
            onChange={(v) => setGenderFilter(v as GenderFilter)}
            options={[
              { value: "all", label: "Все" },
              { value: "male", label: "М" },
              { value: "female", label: "Ж" },
            ]}
          />
          <FilterRow
            label="Уровень"
            value={levelFilter}
            onChange={(v) => setLevelFilter(v as LevelFilter)}
            options={[
              { value: "all", label: "Все" },
              { value: "novice", label: LEVEL_LABEL.novice },
              { value: "medium", label: LEVEL_LABEL.medium },
              { value: "medium_plus", label: LEVEL_LABEL.medium_plus },
              { value: "high", label: LEVEL_LABEL.high },
              { value: "pro", label: LEVEL_LABEL.pro },
            ]}
          />
          <FilterRow
            label="Направление"
            value={directionFilter}
            onChange={(v) => setDirectionFilter(v as DirectionFilter)}
            options={[
              { value: "all", label: "Все" },
              { value: "beach", label: "Пляж" },
              { value: "classic", label: "Классика" },
              { value: "both", label: "И там и там" },
            ]}
          />
        </section>

        {error && (
          <p className="mt-5 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            Ошибка загрузки: {error}
          </p>
        )}

        <section className="mt-5">
          {loading ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center text-sm text-slate-400">
              Загружаем игроков…
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center text-sm text-slate-400">
              {players.length === 0
                ? "Пока нет игроков. Будьте первым."
                : "Никто не подходит под выбранные фильтры."}
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {filtered.map((p) => (
                <PlayerCard key={p.id} player={p} />
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

function FilterRow({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
        {label}
      </p>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              onPointerDown={() => onChange(o.value)}
              style={tapStyle}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition ${
                active
                  ? "bg-orange-500 text-[#0b1535]"
                  : "border border-white/15 bg-white/[0.04] text-slate-200"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PlayerCard({ player }: { player: PublicPlayer }) {
  const level = player.level ?? "novice";
  return (
    <li>
      <Link
        href={`/players/${player.id}`}
        className="block rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-orange-400/40 hover:bg-white/[0.06]"
      >
        <div className="flex items-center gap-3">
          {player.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={player.photo_url}
              alt={player.name}
              className="h-12 w-12 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-base font-black text-[#0b1535]">
              {avatarInitials(player.name)}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-bold">{player.name}</p>
            <p className="text-xs text-slate-400">
              {player.gender ? GENDER_LABEL[player.gender] : "—"}
              {player.city ? ` · ${player.city}` : ""}
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ring-1 ${LEVEL_COLOR[level]}`}
          >
            {LEVEL_LABEL[level]}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
          {player.direction && (
            <span className="rounded-md bg-blue-500/15 px-2 py-0.5 text-blue-200 ring-1 ring-blue-400/30">
              {DIRECTION_LABEL[player.direction]}
            </span>
          )}
          {player.dominant_hand && (
            <span className="rounded-md bg-white/5 px-2 py-0.5 text-slate-300 ring-1 ring-white/10">
              {DOMINANT_HAND_LABEL[player.dominant_hand]}
            </span>
          )}
          {player.game_formats?.slice(0, 3).map((f) => (
            <span
              key={f}
              className="rounded-md bg-orange-500/15 px-2 py-0.5 text-orange-200 ring-1 ring-orange-400/30"
            >
              {GAME_FORMAT_LABEL[f]}
            </span>
          ))}
        </div>
      </Link>
    </li>
  );
}
