"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  DIRECTION_LABEL,
  DOMINANT_HAND_LABEL,
  GAME_FORMAT_LABEL,
  GENDER_LABEL,
  LEVEL_COLOR,
  LEVEL_LABEL,
  TOURNAMENT_EXP_LABEL,
  TRAINING_EXP_LABEL,
  avatarInitials,
  parseTrainingExperience,
  type PublicPlayer,
  type TrainingExp,
} from "@/lib/player";

export default function PublicPlayerPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [player, setPlayer] = useState<PublicPlayer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    fetch(`/api/players/${id}`)
      .then(async (res) => {
        if (!res.ok) {
          if (res.status === 404) throw new Error("Игрок не найден");
          throw new Error(`HTTP ${res.status}`);
        }
        const data = (await res.json()) as { player?: PublicPlayer };
        if (!cancelled) {
          setPlayer(data.player ?? null);
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
  }, [id]);

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-[#0b1535] text-slate-100">
      <header className="sticky top-0 z-20 border-b border-white/5 bg-[#0b1535]/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/players" className="text-sm text-slate-300">
            ← Игроки
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-orange-500 font-black text-[#0b1535]">
              V
            </span>
            <span className="text-base font-bold">
              Volley<span className="text-orange-400">72</span>
            </span>
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:px-6">
        {loading && (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center text-sm text-slate-400">
            Загружаем профиль…
          </div>
        )}

        {error && !loading && (
          <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-6 text-center">
            <p className="text-base font-bold text-rose-200">
              Не удалось загрузить
            </p>
            <p className="mt-2 text-sm text-rose-200/70">{error}</p>
          </div>
        )}

        {player && !loading && <PlayerProfile player={player} />}
      </main>
    </div>
  );
}

function PlayerProfile({ player }: { player: PublicPlayer }) {
  const level = player.level ?? "novice";
  const training = parseTrainingExperience(player.training_experience);

  return (
    <div className="space-y-5">
      <Link
        href={`/players/${player.id}/edit`}
        className="block h-12 w-full rounded-2xl border border-orange-400/40 bg-orange-500/10 text-center text-sm font-bold leading-[3rem] text-orange-200 transition hover:bg-orange-500 hover:text-[#0b1535]"
      >
        ✏️ Редактировать профиль
      </Link>

      <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-orange-500/15 via-white/[0.03] to-blue-500/10 p-5 sm:p-6">
        <div className="flex items-center gap-4">
          {player.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={player.photo_url}
              alt={player.name}
              className="h-20 w-20 shrink-0 rounded-full object-cover ring-2 ring-orange-400/60"
            />
          ) : (
            <span className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-3xl font-black text-[#0b1535]">
              {avatarInitials(player.name)}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-extrabold">{player.name}</h1>
            <p className="mt-1 text-sm text-slate-300">
              {player.gender ? GENDER_LABEL[player.gender] : "—"}
              {player.city ? ` · ${player.city}` : ""}
              {player.height ? ` · ${player.height} см` : ""}
            </p>
            <span
              className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-widest ring-1 ${LEVEL_COLOR[level]}`}
            >
              {LEVEL_LABEL[level]}
            </span>
          </div>
        </div>
      </section>

      <ProfileBlock title="Волейбольный профиль">
        <Row label="Направление">
          {player.direction ? DIRECTION_LABEL[player.direction] : "—"}
        </Row>
        <Row label="Рабочая рука">
          {player.dominant_hand
            ? DOMINANT_HAND_LABEL[player.dominant_hand]
            : "—"}
        </Row>
        <Row label="Форматы игр">
          {player.game_formats && player.game_formats.length ? (
            <span className="inline-flex flex-wrap gap-1.5">
              {player.game_formats.map((f) => (
                <span
                  key={f}
                  className="rounded-md bg-orange-500/15 px-2 py-0.5 text-[11px] text-orange-200 ring-1 ring-orange-400/30"
                >
                  {GAME_FORMAT_LABEL[f]}
                </span>
              ))}
            </span>
          ) : (
            "—"
          )}
        </Row>
      </ProfileBlock>

      <ProfileBlock title="Опыт">
        <Row label="Турниры">
          {player.tournament_experience
            ? TOURNAMENT_EXP_LABEL[player.tournament_experience]
            : "Не указано"}
        </Row>
        <Row label="Тренировки">
          {training.length ? (
            <span className="inline-flex flex-wrap gap-1.5">
              {training.map((t) => (
                <span
                  key={t}
                  className="rounded-md bg-blue-500/15 px-2 py-0.5 text-[11px] text-blue-200 ring-1 ring-blue-400/30"
                >
                  {TRAINING_EXP_LABEL[t as TrainingExp] ?? t}
                </span>
              ))}
            </span>
          ) : (
            "Не указано"
          )}
        </Row>
      </ProfileBlock>

      <ProfileBlock title="Призовые места">
        {player.prize_places && player.prize_places.length > 0 ? (
          <ul className="space-y-2">
            {player.prize_places.map((pp, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.04] px-3 py-2"
              >
                <span className="truncate text-sm">{pp.tournament}</span>
                <span className="text-sm font-bold text-orange-300">
                  {pp.place}{pp.place === 1 ? "🥇" : pp.place === 2 ? "🥈" : pp.place === 3 ? "🥉" : ""}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">Пока нет призовых мест</p>
        )}
      </ProfileBlock>
    </div>
  );
}

function ProfileBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
      <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-300">
        {title}
      </h2>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
      <span className="text-slate-400">{label}</span>
      <span className="text-right text-slate-100">{children}</span>
    </div>
  );
}
