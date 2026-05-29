"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type ChangeEvent } from "react";
import {
  AVAILABLE_TIME_LABEL,
  DIRECTION_LABEL,
  DOMINANT_HAND_LABEL,
  GAME_FORMAT_LABEL,
  GENDER_LABEL,
  LEVEL_LABEL,
  SKILL_HINT,
  SKILL_KEYS,
  SKILL_LABEL,
  computeAge,
  formatPhone,
  isPhoneValid,
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

export type PlayerWizardData = {
  name: string;
  phone: string | null;
  gender: PlayerGender | null;
  birth_date: string | null;
  height: number | null;
  city: string;
  photo_url: string | null;
  direction: Direction | null;
  game_formats: GameFormat[];
  dominant_hand: DominantHand | null;
  available_time: AvailableTime[];
  tournament_experience: TournamentExp | null;
  training_experience: TrainingExp[];
  skills: Partial<Skills>;
};

export type PlayerWizardProps = {
  initial?: Partial<PlayerWizardData>;
  onSubmit: (data: PlayerWizardData) => Promise<void>;
  submitLabel?: string;
  backHref?: string;
};

export default function CreatePlayerPage() {
  const router = useRouter();
  return (
    <PlayerWizard
      submitLabel="Создать профиль"
      onSubmit={async (data) => {
        const res = await fetch("/api/players", {
          method: "POST",
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

export function PlayerWizard({
  initial,
  onSubmit,
  submitLabel,
  backHref,
}: PlayerWizardProps) {
  const [step, setStep] = useState<Step>(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Step 1
  const [name, setName] = useState(initial?.name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [gender, setGender] = useState<PlayerGender | null>(
    initial?.gender ?? null,
  );
  const [birthDate, setBirthDate] = useState(initial?.birth_date ?? "");
  const [height, setHeight] = useState(
    initial?.height != null ? String(initial.height) : "",
  );
  const [city, setCity] = useState(initial?.city ?? "Тюмень");
  const [photo, setPhoto] = useState<string | null>(initial?.photo_url ?? null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Step 2
  const [direction, setDirection] = useState<Direction | null>(
    initial?.direction ?? null,
  );
  const [gameFormats, setGameFormats] = useState<GameFormat[]>(
    initial?.game_formats ?? [],
  );
  const [hand, setHand] = useState<DominantHand | null>(
    initial?.dominant_hand ?? null,
  );

  // Step 3
  const [availableTime, setAvailableTime] = useState<AvailableTime[]>(
    initial?.available_time ?? [],
  );
  const [tournamentExp, setTournamentExp] = useState<TournamentExp | null>(
    initial?.tournament_experience ?? null,
  );
  const [trainingExp, setTrainingExp] = useState<TrainingExp[]>(
    initial?.training_experience ?? [],
  );

  // Step 4
  const [skills, setSkills] = useState<Partial<Skills>>(
    initial?.skills ?? {},
  );

  const phoneValid = phone === "" || isPhoneValid(phone);
  const canNext1 =
    name.trim().length > 0 &&
    gender !== null &&
    phoneValid &&
    (birthDate === "" || /^\d{4}-\d{2}-\d{2}$/.test(birthDate)) &&
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
      await onSubmit({
        name: name.trim(),
        phone: phone.trim() || null,
        gender,
        birth_date: birthDate || null,
        height: height ? Number(height) : null,
        photo_url: photo,
        city: city.trim() || "Тюмень",
        direction,
        game_formats: gameFormats,
        dominant_hand: hand,
        available_time: availableTime,
        tournament_experience: tournamentExp,
        training_experience: trainingExp,
        skills,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-[#0b1535] text-slate-100">
      <header className="border-b border-white/5">
        <div className="mx-auto flex w-full max-w-lg items-center justify-between px-4 py-3 sm:px-6">
          <Link href={backHref ?? "/players"} className="text-sm text-slate-300">
            ← Назад
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
                onFocus={() => {
                  if (!phone) setPhone("+7 ");
                }}
                onChange={(e) => {
                  const next = formatPhone(e.target.value);
                  // Once user has touched the field, never let it fall below "+7 ".
                  setPhone(next || "+7 ");
                }}
                onKeyDown={(e) => {
                  if (
                    (e.key === "Backspace" || e.key === "Delete") &&
                    phone === "+7 "
                  ) {
                    e.preventDefault();
                  }
                }}
                placeholder="+7 (___) ___-__-__"
                type="tel"
                inputMode="tel"
                maxLength={18}
                aria-invalid={phone.length > 3 && !isPhoneValid(phone)}
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

            <Field
              label="Дата рождения"
              hint={
                birthDate && computeAge(birthDate) != null
                  ? `${computeAge(birthDate)} лет — не показывается публично`
                  : "Не показывается в публичном профиле"
              }
            >
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className={`${inputCls} block`}
                style={{ width: "100%", boxSizing: "border-box" }}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
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
              <Field label="Город">
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className={inputCls}
                />
              </Field>
            </div>

            <Field label="Фото профиля">
              <PhotoUpload
                photo={photo}
                onPhoto={setPhoto}
                onError={setPhotoError}
                inputRef={photoInputRef}
              />
              {photoError && (
                <p className="mt-2 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                  {photoError}
                </p>
              )}
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
              <SkillField
                key={key}
                skillKey={key}
                value={skills[key]}
                onChange={(v) =>
                  setSkills((prev) => ({ ...prev, [key]: v }))
                }
              />
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
              {busy ? "Сохраняем…" : (submitLabel ?? "Создать профиль")}
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
      <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-300">
        {label}
        {required && <span className="text-orange-400"> *</span>}
      </p>
      {hint && (
        <p className="mb-1.5 text-[11px] font-normal leading-snug text-slate-500">
          {hint}
        </p>
      )}
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

function PhotoUpload({
  photo,
  onPhoto,
  onError,
  inputRef,
}: {
  photo: string | null;
  onPhoto: (data: string | null) => void;
  onError: (msg: string | null) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  async function compress(file: File, maxDim = 800): Promise<string> {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onerror = () => reject(new Error("read"));
      fr.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("image"));
        img.onload = () => {
          const ratio = Math.min(
            1,
            maxDim / Math.max(img.width, img.height),
          );
          const w = Math.max(1, Math.round(img.width * ratio));
          const h = Math.max(1, Math.round(img.height * ratio));
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("canvas"));
            return;
          }
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL("image/jpeg", 0.85));
        };
        img.src = fr.result as string;
      };
      fr.readAsDataURL(file);
    });
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    onError(null);
    if (!file.type.startsWith("image/")) {
      onError("Файл не похож на изображение");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      onError("Файл больше 5 МБ");
      return;
    }
    try {
      const compressed = await compress(file);
      onPhoto(compressed);
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="flex items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={onFile}
        className="hidden"
      />
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo}
          alt="Фото профиля"
          className="h-16 w-16 shrink-0 rounded-full object-cover ring-2 ring-orange-400/60"
        />
      ) : (
        <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-white/10 text-2xl text-slate-400">
          ?
        </span>
      )}
      <div className="flex-1 space-y-2">
        <button
          type="button"
          onPointerDown={() => inputRef.current?.click()}
          style={tapStyle}
          className="h-12 w-full rounded-xl border border-white/15 bg-white/[0.04] text-sm font-bold text-slate-200"
        >
          {photo ? "Сменить фото" : "📷 Добавить фото"}
        </button>
        {photo && (
          <button
            type="button"
            onPointerDown={() => onPhoto(null)}
            style={tapStyle}
            className="h-10 w-full rounded-xl border border-rose-400/30 text-xs font-semibold text-rose-300"
          >
            Удалить фото
          </button>
        )}
      </div>
    </div>
  );
}

function useTapGesture(threshold = 10) {
  const startRef = useRef<{ x: number; y: number; id: number } | null>(null);
  return {
    onPointerDown: (e: React.PointerEvent) => {
      startRef.current = {
        x: e.clientX,
        y: e.clientY,
        id: e.pointerId,
      };
    },
    onPointerCancel: () => {
      startRef.current = null;
    },
    onPointerLeave: () => {
      startRef.current = null;
    },
    /**
     * Returns true if the pointer moved less than `threshold` since pointerdown.
     * Resets the state in either case.
     */
    confirmTap: (e: React.PointerEvent): boolean => {
      const s = startRef.current;
      startRef.current = null;
      if (!s || s.id !== e.pointerId) return false;
      const dx = e.clientX - s.x;
      const dy = e.clientY - s.y;
      return Math.hypot(dx, dy) <= threshold;
    },
  };
}

function SkillField({
  skillKey,
  value,
  onChange,
}: {
  skillKey: keyof typeof SKILL_LABEL;
  value: number | undefined;
  onChange: (v: number) => void;
}) {
  const [showHint, setShowHint] = useState(false);
  const tap = useTapGesture();
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wide text-slate-300">
          {SKILL_LABEL[skillKey]}
          <span className="text-orange-400"> *</span>
        </span>
        <button
          type="button"
          onPointerDown={tap.onPointerDown}
          onPointerUp={(e) => {
            if (tap.confirmTap(e)) setShowHint((v) => !v);
          }}
          onPointerCancel={tap.onPointerCancel}
          onPointerLeave={tap.onPointerLeave}
          aria-expanded={showHint}
          aria-label="Подсказка"
          style={tapStyle}
          className={`grid h-8 w-8 place-items-center rounded-full text-base transition ${
            showHint
              ? "bg-orange-500"
              : "border border-white/20"
          }`}
        >
          ℹ️
        </button>
      </div>
      {showHint && (
        <p className="mb-2 rounded-lg border border-orange-400/30 bg-orange-500/10 px-3 py-2 text-xs text-orange-100">
          {SKILL_HINT[skillKey]}
        </p>
      )}
      <Rating value={value} onChange={onChange} />
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
      {[1, 2, 3, 4, 5].map((n) => (
        <RatingButton
          key={n}
          n={n}
          active={value === n}
          onTap={() => onChange(n)}
        />
      ))}
    </div>
  );
}

function RatingButton({
  n,
  active,
  onTap,
}: {
  n: number;
  active: boolean;
  onTap: () => void;
}) {
  const tap = useTapGesture();
  return (
    <button
      type="button"
      onPointerDown={tap.onPointerDown}
      onPointerUp={(e) => {
        if (tap.confirmTap(e)) onTap();
      }}
      onPointerCancel={tap.onPointerCancel}
      onPointerLeave={tap.onPointerLeave}
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
}
