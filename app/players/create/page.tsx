"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AVAILABLE_TIME_LABEL,
  DIRECTION_LABEL,
  DOMINANT_HAND_LABEL,
  GAME_FORMAT_LABEL,
  GENDER_LABEL,
  LEVEL_LABEL,
  SKILL_KEYS,
  SKILL_LABEL,
  TOURNAMENT_EXP_LABEL,
  TRAINING_EXP_LABEL,
  computeLevel,
  type AvailableTime,
  type Direction,
  type DominantHand,
  type GameFormat,
  type PlayerGender,
  type Skills,
  type TournamentExp,
  type TrainingExp,
} from "@/lib/player";

const tapStyle = {
  touchAction: "manipulation" as const,
  userSelect: "none" as const,
  WebkitUserSelect: "none" as const,
  WebkitTapHighlightColor: "transparent",
};

const inputCls =
  "h-12 w-full rounded-xl border border-white/15 bg-[#1a2a55] px-4 text-base text-white outline-none transition focus:border-orange-400";

type Step = 1 | 2 | 3 | 4;

export default function CreatePlayerPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Step 1
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<PlayerGender | null>(null);
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [city, setCity] = useState("Тюмень");

  // Step 2
  const [direction, setDirection] = useState<Direction | null>(null);
  const [gameFormats, setGameFormats] = useState<GameFormat[]>([]);
  const [hand, setHand] = useState<DominantHand | null>(null);

  // Step 3
  const [availableTime, setAvailableTime] = useState<AvailableTime[]>([]);
  const [tournamentExp, setTournamentExp] = useState<TournamentExp | null>(
    null,
  );
  const [trainingExp, setTrainingExp] = useState<TrainingExp[]>([]);

  // Step 4
  const [skills, setSkills] = useState<Partial<Skills>>({});

  function toggleArr<T>(arr: T[], v: T): T[] {
    return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
  }

  const canNext1 =
    name.trim().length > 0 &&
    gender !== null &&
    (age === "" || /^\d+$/.test(age)) &&
    (height === "" || /^\d+$/.test(height));
  const canNext2 =
    direction !== null && gameFormats.length > 0 && hand !== null;
  const canNext3 =
    availableTime.length > 0 &&
    tournamentExp !== null &&
    trainingExp.length > 0;
  const canSubmit =
    canNext1 &&
    canNext2 &&
    canNext3 &&
    SKILL_KEYS.every((k) => typeof skills[k] === "number");

  const computedLevel = computeLevel(skills);

  async function submit() {
    if (!canSubmit || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() || null,
          gender,
          age: age ? Number(age) : null,
          height: height ? Number(height) : null,
          city: city.trim() || "Тюмень",
          direction,
          game_formats: gameFormats,
          dominant_hand: hand,
          available_time: availableTime,
          tournament_experience: tournamentExp,
          training_experience: trainingExp,
          skills,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        player?: { id: string };
        error?: string;
      };
      if (!res.ok || !data.player?.id) {
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      router.push(`/players/${data.player.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-[#0b1535] text-slate-100">
      <header className="border-b border-white/5">
        <div className="mx-auto flex w-full max-w-lg items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/players" className="text-sm text-slate-300">
            ← К списку
          </Link>
          <span className="text-xs uppercase tracking-widest text-slate-400">
            Шаг {step} из 4
          </span>
        </div>
        <div className="h-1 bg-white/5">
          <div
            className="h-full bg-orange-500 transition-[width] duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6 sm:px-6">
        {step === 1 && (
          <StepBlock
            title="Основное"
            subtitle="Расскажите о себе"
          >
            <Field label="Имя" required>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Иван Иванов"
                className={inputCls}
                autoComplete="name"
              />
            </Field>

            <Field
              label="Телефон"
              hint="Не показывается в публичном профиле"
            >
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+7 (900) 000-00-00"
                type="tel"
                inputMode="tel"
                className={inputCls}
                autoComplete="tel"
              />
            </Field>

            <Field label="Пол" required>
              <SegmentedBig
                options={[
                  { value: "male", label: GENDER_LABEL.male },
                  { value: "female", label: GENDER_LABEL.female },
                ]}
                value={gender ?? ""}
                onChange={(v) => setGender(v as PlayerGender)}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Возраст">
                <input
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={age}
                  onChange={(e) =>
                    setAge(e.target.value.replace(/\D/g, "").slice(0, 3))
                  }
                  placeholder="25"
                  className={inputCls}
                />
              </Field>
              <Field label="Рост, см">
                <input
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={height}
                  onChange={(e) =>
                    setHeight(e.target.value.replace(/\D/g, "").slice(0, 3))
                  }
                  placeholder="180"
                  className={inputCls}
                />
              </Field>
            </div>

            <Field label="Город">
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className={inputCls}
              />
            </Field>
          </StepBlock>
        )}

        {step === 2 && (
          <StepBlock
            title="Волейбольный профиль"
            subtitle="Где и как играете"
          >
            <Field label="Направление" required>
              <ChoiceList
                options={[
                  { value: "beach", label: DIRECTION_LABEL.beach },
                  { value: "classic", label: DIRECTION_LABEL.classic },
                  { value: "both", label: DIRECTION_LABEL.both },
                ]}
                value={direction}
                onChange={(v) => setDirection(v as Direction)}
              />
            </Field>

            <Field label="Форматы игр" hint="Выберите все подходящие" required>
              <ChoiceList
                multi
                options={(
                  ["mixed", "female", "male", "park"] as GameFormat[]
                ).map((f) => ({ value: f, label: GAME_FORMAT_LABEL[f] }))}
                value={gameFormats}
                onChange={(v) => setGameFormats(v as GameFormat[])}
              />
            </Field>

            <Field label="Рабочая рука" required>
              <SegmentedBig
                options={[
                  { value: "right", label: DOMINANT_HAND_LABEL.right },
                  { value: "left", label: DOMINANT_HAND_LABEL.left },
                ]}
                value={hand ?? ""}
                onChange={(v) => setHand(v as DominantHand)}
              />
            </Field>
          </StepBlock>
        )}

        {step === 3 && (
          <StepBlock
            title="Опыт и время"
            subtitle="Когда можете играть и какой опыт"
          >
            <Field label="Удобное время" hint="Можно несколько" required>
              <ChoiceList
                multi
                options={(
                  [
                    "weekday",
                    "weekend",
                    "any_day",
                    "weekday_day",
                    "weekday_evening",
                    "friday_evening",
                    "weekend_morning",
                    "weekend_day",
                    "weekend_evening",
                  ] as AvailableTime[]
                ).map((t) => ({ value: t, label: AVAILABLE_TIME_LABEL[t] }))}
                value={availableTime}
                onChange={(v) => setAvailableTime(v as AvailableTime[])}
              />
            </Field>

            <Field label="Турнирный опыт" required>
              <ChoiceList
                options={(["none", "1-5", "5-10", "10+"] as TournamentExp[]).map(
                  (t) => ({ value: t, label: TOURNAMENT_EXP_LABEL[t] }),
                )}
                value={tournamentExp}
                onChange={(v) => setTournamentExp(v as TournamentExp)}
              />
            </Field>

            <Field
              label="Тренировочный опыт"
              hint="Можно несколько"
              required
            >
              <ChoiceList
                multi
                options={(
                  [
                    "none",
                    "sometimes",
                    "regular",
                    "with_coach",
                    "pro_past",
                  ] as TrainingExp[]
                ).map((t) => ({ value: t, label: TRAINING_EXP_LABEL[t] }))}
                value={trainingExp}
                onChange={(v) => setTrainingExp(v as TrainingExp[])}
              />
            </Field>
          </StepBlock>
        )}

        {step === 4 && (
          <StepBlock
            title="Самооценка навыков"
            subtitle="Оцените каждый навык от 1 до 5"
          >
            {SKILL_KEYS.map((key) => (
              <Field key={key} label={SKILL_LABEL[key]} required>
                <Rating
                  value={skills[key]}
                  onChange={(v) =>
                    setSkills((prev) => ({ ...prev, [key]: v }))
                  }
                />
              </Field>
            ))}
            <div className="rounded-2xl border border-orange-400/40 bg-orange-500/10 p-4 text-center">
              <p className="text-[10px] uppercase tracking-widest text-orange-300">
                Расчётный уровень
              </p>
              <p className="mt-1 text-2xl font-black text-orange-300">
                {LEVEL_LABEL[computedLevel]}
              </p>
            </div>
          </StepBlock>
        )}

        {error && (
          <p className="mt-4 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {error}
          </p>
        )}

        <div className="mt-6 flex gap-3">
          {step > 1 && (
            <button
              type="button"
              onPointerDown={() => setStep((s) => Math.max(1, s - 1) as Step)}
              style={tapStyle}
              className="h-14 flex-1 rounded-2xl border border-white/15 bg-white/[0.04] text-sm font-bold text-slate-200"
            >
              ← Назад
            </button>
          )}
          {step < 4 ? (
            <button
              type="button"
              onPointerDown={() => {
                const canAdvance =
                  step === 1 ? canNext1 : step === 2 ? canNext2 : canNext3;
                if (canAdvance) setStep((s) => Math.min(4, s + 1) as Step);
              }}
              disabled={
                step === 1 ? !canNext1 : step === 2 ? !canNext2 : !canNext3
              }
              style={tapStyle}
              className="h-14 flex-1 rounded-2xl bg-orange-500 text-base font-bold text-[#0b1535] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Далее →
            </button>
          ) : (
            <button
              type="button"
              onPointerDown={submit}
              disabled={!canSubmit || busy}
              style={tapStyle}
              className="h-14 flex-1 rounded-2xl bg-orange-500 text-base font-bold text-[#0b1535] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Создаём…" : "Создать профиль"}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

function StepBlock({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
        {title}
      </h1>
      <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
      <div className="mt-6 space-y-5">{children}</div>
    </div>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-300">
        {label}
        {required && <span className="text-orange-400"> *</span>}
        {hint && <span className="ml-2 text-[10px] font-normal text-slate-500">{hint}</span>}
      </p>
      {children}
    </div>
  );
}

function SegmentedBig({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onPointerDown={() => onChange(o.value)}
            aria-pressed={active}
            style={tapStyle}
            className={`h-14 rounded-xl border-2 text-base font-bold transition active:scale-[0.99] ${
              active
                ? "border-orange-500 bg-orange-500 text-white"
                : "border-white/15 bg-[#0b1535] text-white"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function ChoiceList({
  options,
  value,
  onChange,
  multi,
}: {
  options: { value: string; label: string }[];
  value: string | string[] | null;
  onChange: (v: string | string[]) => void;
  multi?: boolean;
}) {
  const selected = Array.isArray(value) ? value : value ? [value] : [];
  return (
    <div className="grid gap-2">
      {options.map((o) => {
        const active = selected.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            onPointerDown={() => {
              if (multi) {
                const next = active
                  ? selected.filter((x) => x !== o.value)
                  : [...selected, o.value];
                onChange(next);
              } else {
                onChange(o.value);
              }
            }}
            aria-pressed={active}
            style={tapStyle}
            className={`flex h-12 items-center gap-3 rounded-xl border-2 px-4 text-left text-sm font-bold transition active:scale-[0.99] ${
              active
                ? "border-orange-500 bg-orange-500/15 text-white"
                : "border-white/15 bg-[#0b1535] text-slate-200"
            }`}
          >
            <span
              className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 ${
                active ? "border-orange-400 bg-orange-500" : "border-white/30"
              }`}
            >
              {active && (multi ? "✓" : "●")}
            </span>
            <span>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function Rating({
  value,
  onChange,
}: {
  value: number | undefined;
  onChange: (v: number) => void;
}) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {[1, 2, 3, 4, 5].map((n) => {
        const active = value === n;
        return (
          <button
            key={n}
            type="button"
            onPointerDown={() => onChange(n)}
            aria-pressed={active}
            style={tapStyle}
            className={`h-14 rounded-xl border-2 text-lg font-black transition active:scale-[0.99] ${
              active
                ? "border-orange-500 bg-orange-500 text-white"
                : "border-white/15 bg-[#0b1535] text-slate-300"
            }`}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}
