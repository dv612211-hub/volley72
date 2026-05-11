import { getEvents, type EventRow } from "@/lib/api";
import { formatEventDate, formatPrice } from "@/lib/format";
import { ApplyButton } from "./components/ApplyButton";

async function loadEvents(): Promise<EventRow[]> {
  try {
    return await getEvents();
  } catch (err) {
    console.error("Failed to load events:", err);
    return [];
  }
}

export default async function Home() {
  const events = await loadEvents();
  const featured = events[0];
  const list = events.slice(0, 6);

  return (
    <div className="flex flex-1 flex-col bg-[#0b1535] text-slate-100">
      <header className="sticky top-0 z-20 border-b border-white/5 bg-[#0b1535]/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <a href="/" className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-orange-500 font-black text-[#0b1535] shadow-lg shadow-orange-500/30">
              V
            </span>
            <span className="text-lg font-bold tracking-tight">
              Volley<span className="text-orange-400">72</span>
            </span>
          </a>
          <nav className="hidden items-center gap-7 text-sm text-slate-300 md:flex">
            <a href="#events" className="hover:text-white">События</a>
            <a href="#about" className="hover:text-white">О нас</a>
            <a href="#contacts" className="hover:text-white">Контакты</a>
          </nav>
          <a
            href="#events"
            className="rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-[#0b1535] transition hover:bg-orange-400"
          >
            Записаться
          </a>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-32 right-[-10%] h-[480px] w-[480px] rounded-full bg-orange-500/20 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-40 left-[-10%] h-[420px] w-[420px] rounded-full bg-blue-500/20 blur-3xl"
          />
          <div className="mx-auto grid w-full max-w-6xl gap-12 px-5 py-20 sm:px-8 md:grid-cols-2 md:py-28">
            <div className="flex flex-col justify-center">
              <span className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-orange-400/30 bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-300">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
                Тюмень · сезон 2026
              </span>
              <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
                Волейбол
                <br />в <span className="text-orange-400">Тюмени</span>
              </h1>
              <p className="mt-5 max-w-md text-base text-slate-300 sm:text-lg">
                Игры, тренировки и турниры для всех уровней.
                Найди свой состав, забронируй место — и на площадку.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href="#events"
                  className="flex h-12 items-center justify-center rounded-full bg-orange-500 px-7 text-sm font-semibold text-[#0b1535] transition hover:bg-orange-400"
                >
                  Ближайшие игры
                </a>
                <a
                  href="#about"
                  className="flex h-12 items-center justify-center rounded-full border border-white/15 px-7 text-sm font-semibold text-slate-100 transition hover:bg-white/5"
                >
                  Как это работает
                </a>
              </div>
              <dl className="mt-10 grid grid-cols-3 gap-4 border-t border-white/10 pt-6 text-sm">
                <div>
                  <dt className="text-slate-400">Игроков</dt>
                  <dd className="text-2xl font-bold">420+</dd>
                </div>
                <div>
                  <dt className="text-slate-400">Игр в неделю</dt>
                  <dd className="text-2xl font-bold">12</dd>
                </div>
                <div>
                  <dt className="text-slate-400">Залов</dt>
                  <dd className="text-2xl font-bold">7</dd>
                </div>
              </dl>
            </div>

            <div className="relative hidden md:block">
              <div className="absolute inset-0 rotate-3 rounded-3xl bg-gradient-to-br from-orange-500/30 to-blue-500/20 blur-2xl" />
              <div className="relative flex h-full min-h-[420px] flex-col justify-between rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur">
                {featured ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-xs uppercase tracking-widest text-slate-400">
                        {formatEventDate(featured.starts_at)}
                      </span>
                      <span className="rounded-full bg-orange-500/15 px-3 py-1 text-xs font-semibold text-orange-300 ring-1 ring-orange-400/30">
                        {formatPrice(featured.price)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">
                        {featured.venue?.name ?? "Место уточняется"}
                      </p>
                      <p className="mt-2 text-3xl font-bold">{featured.title}</p>
                      <p className="mt-3 text-slate-300">
                        {featured.description ??
                          (featured.type
                            ? `Формат: ${featured.type}.`
                            : "Подробности в карточке события.")}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 text-sm">
                        {featured.coach?.user?.name ? (
                          <>
                            <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-sm font-bold text-[#0b1535]">
                              {featured.coach.user.name.charAt(0).toUpperCase()}
                            </span>
                            <span className="text-slate-300">
                              Тренер: {featured.coach.user.name}
                            </span>
                          </>
                        ) : (
                          <span className="text-slate-400">
                            Открытая запись · приходи играть
                          </span>
                        )}
                      </div>
                      <ApplyButton
                        event={featured}
                        className="inline-flex h-10 items-center justify-center rounded-full bg-orange-500 px-5 text-sm font-semibold text-[#0b1535] transition hover:bg-orange-400"
                      />
                    </div>
                  </>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-center text-slate-400">
                    <p className="text-lg font-semibold text-slate-200">
                      Скоро здесь появятся игры
                    </p>
                    <p className="mt-2 max-w-xs text-sm">
                      Расписание обновляется. Подпишитесь на Telegram-канал, чтобы не пропустить.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section id="events" className="border-t border-white/5 bg-[#091029]">
          <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 md:py-20">
            <div className="mb-10 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  Ближайшие <span className="text-orange-400">события</span>
                </h2>
                <p className="mt-2 text-slate-400">
                  Бронируй место в один клик. Места заканчиваются быстро.
                </p>
              </div>
              <a
                href="#"
                className="hidden rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200 hover:bg-white/5 sm:inline-block"
              >
                Все события →
              </a>
            </div>

            {list.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center text-slate-400">
                <p className="text-lg font-semibold text-slate-200">
                  Пока нет запланированных событий
                </p>
                <p className="mt-2 text-sm">
                  Загляните позже — расписание на ближайшие недели появится скоро.
                </p>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((event) => (
                  <article
                    key={event.id}
                    className="group flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-orange-400/40 hover:bg-white/[0.06]"
                  >
                    <div className="flex items-center justify-between">
                      {event.type ? (
                        <span className="rounded-full bg-blue-500/15 px-2.5 py-1 text-xs font-medium text-blue-200 ring-1 ring-blue-400/30">
                          {event.type}
                        </span>
                      ) : (
                        <span />
                      )}
                      <span className="text-xs font-semibold text-orange-300">
                        {formatPrice(event.price)}
                      </span>
                    </div>
                    <h3 className="mt-4 text-xl font-bold">{event.title}</h3>
                    <p className="mt-1 text-sm text-slate-400">
                      {event.venue?.name ?? "Место уточняется"}
                    </p>
                    <p className="mt-4 text-sm font-medium text-slate-200">
                      {formatEventDate(event.starts_at)}
                    </p>
                    {event.coach?.user?.name && (
                      <p className="mt-1 text-xs text-slate-400">
                        Тренер: {event.coach.user.name}
                      </p>
                    )}
                    <ApplyButton
                      event={event}
                      className="mt-6 h-10 rounded-full bg-orange-500/10 text-sm font-semibold text-orange-300 ring-1 ring-orange-400/30 transition group-hover:bg-orange-500 group-hover:text-[#0b1535]"
                    />
                  </article>
                ))}
              </div>
            )}
          </div>
<section style={{padding: "40px 16px", textAlign: "center", background: "#0b1535"}}>
  <h2 style={{fontSize: "24px", fontWeight: 700, marginBottom: "16px", color: "#fff"}}>Турниры</h2>
  <div style={{display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap"}}>
    <a href="/tournaments/create" style={{background: "#f97316", color: "#fff", padding: "14px 28px", borderRadius: "10px", fontWeight: 700, textDecoration: "none", fontSize: "16px"}}>Создать турнир</a>
    <a href="/tournaments" style={{background: "#1a2a55", color: "#fff", padding: "14px 28px", borderRadius: "10px", fontWeight: 700, textDecoration: "none", fontSize: "16px"}}>Все турниры</a>
  </div>
</section>

      <section style={{padding: '40px 16px', textAlign: 'center', background: '#0b1535'}}>
        <h2 style={{fontSize: '24px', fontWeight: 700, marginBottom: '16px', color: '#fff'}}>Турниры</h2>
        <div style={{display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap'}}>
          <a href='/tournaments/create' style={{background: '#f97316', color: '#fff', padding: '14px 28px', borderRadius: '10px', fontWeight: 700, textDecoration: 'none', fontSize: '16px'}}>Создать турнир</a>
          <a href='/tournaments' style={{background: '#1a2a55', color: '#fff', padding: '14px 28px', borderRadius: '10px', fontWeight: 700, textDecoration: 'none', fontSize: '16px'}}>Все турниры</a>
        </div>
      </section>
      </main>
      <footer
        id="contacts"
        className="border-t border-white/10 bg-[#070b20]"
      >
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-12 sm:px-8 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-orange-500 font-black text-[#0b1535]">
                V
              </span>
              <span className="text-lg font-bold">
                Volley<span className="text-orange-400">72</span>
              </span>
            </div>
            <p className="mt-3 max-w-xs text-sm text-slate-400">
              Волейбольное сообщество Тюмени. Игры, тренировки и турниры круглый год.
            </p>
          </div>
          <div className="text-sm">
            <h4 className="mb-3 font-semibold">Навигация</h4>
            <ul className="space-y-2 text-slate-400">
              <li><a href="#events" className="hover:text-white">События</a></li>
              <li><a href="#about" className="hover:text-white">О нас</a></li>
              <li><a href="#contacts" className="hover:text-white">Контакты</a></li>
            </ul>
          </div>
          <div className="text-sm">
            <h4 className="mb-3 font-semibold">Связь</h4>
            <ul className="space-y-2 text-slate-400">
              <li>Тюмень, Россия</li>
              <li><a href="mailto:hi@volley72.ru" className="hover:text-white">hi@volley72.ru</a></li>
              <li><a href="https://t.me/volley72" className="hover:text-white">Telegram: @volley72</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/5">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-5 py-5 text-xs text-slate-500 sm:flex-row sm:px-8">
            <span>© {new Date().getFullYear()} Volley72. Все права защищены.</span>
            <span>Сделано с любовью к игре</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
