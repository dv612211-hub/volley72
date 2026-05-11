"use client";

import { useEffect, useRef, useState } from "react";
import { type EventRow } from "@/lib/api";
import { formatEventDate, formatPrice } from "@/lib/format";

type Props = {
  event: EventRow;
  className?: string;
  children?: React.ReactNode;
};

const inputCls =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-orange-400/60 focus:bg-white/[0.06]";

export function ApplyButton({ event, className, children }: Props) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [comment, setComment] = useState("");
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    firstFieldRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const reset = () => {
    setName("");
    setPhone("");
    setComment("");
    setSuccess(false);
    setError(null);
    setSubmitting(false);
  };

  const close = () => {
    setOpen(false);
    setTimeout(reset, 200);
  };

  const phoneDigits = phone.replace(/\D/g, "");
  const phoneValid = phoneDigits.length >= 11;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim() || !phoneValid) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: event.id,
          name: name.trim(),
          phone: phone.trim(),
          comment: comment.trim() || null,
        }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(
          (payload as { error?: string })?.error || `HTTP ${res.status}`,
        );
      }
      setSuccess(true);
    } catch (err) {
      console.log("createApplication error:", err);
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className}
      >
        {children ?? "Записаться"}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="apply-title"
          className="fixed inset-0 z-50 flex items-end justify-center px-4 py-6 sm:items-center"
        >
          <div
            className="absolute inset-0 bg-[#020512]/80 backdrop-blur-sm"
            onClick={close}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0b1535] p-6 shadow-2xl shadow-orange-500/10 sm:p-7">
            <button
              type="button"
              onClick={close}
              aria-label="Закрыть"
              className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full text-xl leading-none text-slate-400 transition hover:bg-white/5 hover:text-white"
            >
              ×
            </button>

            {success ? (
              <div className="py-4 text-center">
                <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-orange-500 text-3xl font-bold text-[#0b1535]">
                  ✓
                </div>
                <h3 id="apply-title" className="text-2xl font-bold">
                  Вы записаны!
                </h3>
                <p className="mt-2 text-sm text-slate-300">
                  Мы свяжемся с вами по указанному телефону для подтверждения.
                </p>
                <button
                  type="button"
                  onClick={close}
                  className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-orange-500 px-6 text-sm font-semibold text-[#0b1535] transition hover:bg-orange-400"
                >
                  Отлично
                </button>
              </div>
            ) : (
              <form onSubmit={onSubmit} noValidate>
                <span className="inline-flex items-center gap-2 rounded-full border border-orange-400/30 bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-300">
                  Запись на событие
                </span>
                <h3 id="apply-title" className="mt-3 text-2xl font-bold">
                  {event.title}
                </h3>
                <p className="mt-1 text-sm text-slate-400">
                  {formatEventDate(event.starts_at)}
                  {event.venue?.name ? ` · ${event.venue.name}` : ""}
                </p>
                <p className="mt-1 text-sm font-medium text-orange-300">
                  {formatPrice(event.price)}
                </p>

                <div className="mt-6 space-y-4">
                  <Field label="Имя" required>
                    <input
                      ref={firstFieldRef}
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoComplete="name"
                      placeholder="Иван Иванов"
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Телефон" required>
                    <input
                      required
                      type="tel"
                      inputMode="tel"
                      value={phone}
                      onChange={(e) => setPhone(formatPhone(e.target.value))}
                      autoComplete="tel"
                      placeholder="+7 (___) ___-__-__"
                      maxLength={18}
                      aria-invalid={phone.length > 0 && !phoneValid}
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Комментарий">
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={3}
                      placeholder="Уровень, опыт, пожелания (необязательно)"
                      className={`${inputCls} resize-none`}
                    />
                  </Field>
                </div>

                {error && (
                  <p className="mt-4 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                    Не удалось отправить заявку: {error}
                  </p>
                )}

                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={close}
                    className="h-11 rounded-full border border-white/15 px-5 text-sm font-semibold text-slate-200 transition hover:bg-white/5"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !name.trim() || !phoneValid}
                    className="h-11 rounded-full bg-orange-500 px-6 text-sm font-semibold text-[#0b1535] transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? "Отправляем…" : "Записаться"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function formatPhone(input: string): string {
  let body = input.replace(/\D/g, "");
  if (body.startsWith("7") || body.startsWith("8")) body = body.slice(1);
  body = body.slice(0, 10);
  if (body.length === 0) return "";

  let out = "+7 (" + body.slice(0, 3);
  if (body.length >= 3) out += ")";
  if (body.length > 3) out += " " + body.slice(3, 6);
  if (body.length > 6) out += "-" + body.slice(6, 8);
  if (body.length > 8) out += "-" + body.slice(8, 10);
  return out;
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object") {
    const e = err as Record<string, unknown>;
    if (typeof e.message === "string" && e.message) return e.message;
    if (typeof e.error_description === "string") return e.error_description;
    if (typeof e.error === "string") return e.error;
    try {
      return JSON.stringify(err);
    } catch {
      return String(err);
    }
  }
  return String(err);
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-300">
        {label}
        {required && <span className="text-orange-400"> *</span>}
      </span>
      {children}
    </label>
  );
}
