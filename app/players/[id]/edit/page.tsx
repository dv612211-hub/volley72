"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  parseTrainingExperience,
  type AvailableTime,
  type Direction,
  type DominantHand,
  type GameFormat,
  type PlayerGender,
  type Skills,
  type TournamentExp,
  type TrainingExp,
} from "@/lib/player";
import {
  PlayerWizard,
  type PlayerWizardData,
} from "@/app/players/create/page";

type ServerPlayer = {
  id: string;
  name: string;
  phone?: string | null;
  gender?: PlayerGender | null;
  birth_date?: string | null;
  height?: number | null;
  city?: string | null;
  photo_url?: string | null;
  direction?: Direction | null;
  game_formats?: GameFormat[] | null;
  dominant_hand?: DominantHand | null;
  available_time?: AvailableTime[] | null;
  tournament_experience?: TournamentExp | null;
  training_experience?: string | null;
  skills?: Partial<Skills> | null;
};

function toWizardData(p: ServerPlayer): Partial<PlayerWizardData> {
  return {
    name: p.name ?? "",
    phone: p.phone ?? null,
    gender: p.gender ?? null,
    birth_date: p.birth_date ?? null,
    height: p.height ?? null,
    city: p.city ?? "Тюмень",
    photo_url: p.photo_url ?? null,
    direction: p.direction ?? null,
    game_formats: p.game_formats ?? [],
    dominant_hand: p.dominant_hand ?? null,
    available_time: p.available_time ?? [],
    tournament_experience: p.tournament_experience ?? null,
    training_experience: parseTrainingExperience(p.training_experience ?? null),
    skills: (p.skills as Partial<Skills>) ?? {},
  };
}

export default function EditPlayerPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;

  const [initial, setInitial] = useState<Partial<PlayerWizardData> | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    fetch(`/api/players/${id}?include=full`)
      .then(async (res) => {
        if (!res.ok) {
          if (res.status === 404) throw new Error("Игрок не найден");
          throw new Error(`HTTP ${res.status}`);
        }
        const data = (await res.json()) as { player?: ServerPlayer };
        if (cancelled) return;
        if (!data.player) {
          throw new Error("Пустой ответ сервера");
        }
        setInitial(toWizardData(data.player));
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-1 flex-col items-center justify-center bg-[#0b1535] px-4 text-center text-slate-100">
        <p className="text-3xl">⚠️</p>
        <p className="mt-3 text-base font-bold">Не удалось загрузить</p>
        <p className="mt-2 max-w-xs text-sm text-rose-200">{error}</p>
      </div>
    );
  }

  if (!initial) {
    return (
      <div className="flex min-h-screen flex-1 flex-col items-center justify-center bg-[#0b1535] px-4 text-center text-slate-100">
        <p className="text-3xl">⏳</p>
        <p className="mt-3 text-sm text-slate-400">Загружаем профиль…</p>
      </div>
    );
  }

  return (
    <PlayerWizard
      initial={initial}
      submitLabel="Сохранить изменения"
      backHref={`/players/${id}`}
      onSubmit={async (data) => {
        const res = await fetch(`/api/players/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const payload = (await res.json().catch(() => ({}))) as {
          player?: { id: string };
          error?: string;
        };
        if (!res.ok || !payload.player?.id) {
          throw new Error(payload.error ?? `HTTP ${res.status}`);
        }
        router.push(`/players/${payload.player.id}`);
      }}
    />
  );
}
