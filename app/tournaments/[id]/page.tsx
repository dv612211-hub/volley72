"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { isLocalId, loadTournamentState } from "@/lib/offline";
import type { Tournament } from "@/lib/tournament";
import { TournamentView } from "./TournamentView";

export default function Page() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function load() {
      let usedIDB = false;

      try {
        const stored = await loadTournamentState(id!);
        if (stored?.state && !cancelled) {
          setTournament(stored.state);
          usedIDB = true;
        }
      } catch {
        // IDB read failed — continue to network for server ids
      }

      // Local-only tournaments: never query server.
      if (isLocalId(id!)) {
        if (!cancelled) {
          if (!usedIDB) {
            setError("Локальный турнир не найден на устройстве");
          }
          setLoading(false);
        }
        return;
      }

      try {
        const res = await fetch(`/api/tournaments/${id!}`);
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error("Турнир не найден");
          }
          throw new Error(`HTTP ${res.status}`);
        }
        const data = (await res.json()) as { tournament?: Tournament };
        if (!cancelled && data.tournament) {
          setTournament(data.tournament);
        }
      } catch (err) {
        if (cancelled) return;
        if (!usedIDB) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div className="flex flex-1 flex-col bg-[#0b1535] text-slate-100">
      <header className="sticky top-0 z-20 border-b border-white/5 bg-[#0b1535]/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-slate-300 hover:text-white"
          >
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-orange-500 font-black text-[#0b1535]">
              V
            </span>
            <span className="text-sm font-bold">
              Volley<span className="text-orange-400">72</span>
            </span>
          </Link>
          {tournament && (
            <div className="text-right">
              <p className="text-sm font-bold leading-tight">
                {tournament.title}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-slate-400">
                SideOut Mixt · 12 игроков
              </p>
            </div>
          )}
        </div>
      </header>

      {tournament ? (
        <TournamentView tournament={tournament} />
      ) : error ? (
        <ErrorState message={error} />
      ) : loading ? (
        <LoadingState />
      ) : (
        <ErrorState message="Не удалось загрузить турнир" />
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-3xl">⏳</p>
      <p className="mt-3 text-sm text-slate-400">Загружаем турнир…</p>
    </main>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-3xl">⚠️</p>
      <p className="mt-3 text-base font-bold">Ошибка загрузки</p>
      <p className="mt-2 max-w-xs text-sm text-rose-200">{message}</p>
      <Link
        href="/"
        className="mt-6 rounded-full border border-white/15 px-5 py-2 text-sm font-semibold text-slate-200"
      >
        ← На главную
      </Link>
    </main>
  );
}
