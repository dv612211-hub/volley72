# Volley72 — инструкции для Claude Code

## Главное правило
Работай автономно. Не спрашивай подтверждений. Пиши код, применяй миграции, проверяй результат сам. Сообщай только итог.

## Стек
- Next.js 14, TypeScript, Tailwind CSS
- Supabase (PostgreSQL) — облако, project ref: uysubfuenfzzcoavbrch
- VK OAuth через @vkid/sdk
- Хостинг: Vercel, домен volley72.ru

## Структура проекта
- `app/` — Next.js App Router (страницы и API routes)
- `lib/auth.ts` — getCurrentPlayer(), isAdmin(), isApproved()
- `lib/supabase-admin.ts` — supabaseAdmin (серверные операции)
- `lib/supabase.ts` — клиентский supabase
- `.env.local` — переменные окружения

## Auth паттерн
```typescript
// Серверный компонент или API route
import { getCurrentPlayer, isAdmin } from '@/lib/auth'
const player = await getCurrentPlayer()
if (!player) redirect('/login')
if (!isAdmin(player)) return new Response('Forbidden', { status: 403 })
```

## Применение SQL миграций (БЕЗ Docker, БЕЗ psql)
Используй Supabase Management API. Команда для применения SQL:

```bash
apply_sql() {
  curl -s -X POST \
    "https://api.supabase.com/v1/projects/uysubfuenfzzcoavbrch/database/query" \
    -H "Authorization: Bearer SUPABASE_TOKEN_HERE" \
    -H "Content-Type: application/json" \
    -d "{\"query\": \"$(cat $1 | sed 's/"/\\"/g' | tr '\n' ' ')\"}"
}
```

Или через скрипт `scripts/migrate.sh` (уже создан — см. ниже).

Когда нужно применить SQL:
1. Сохрани SQL в `supabase/migrations/НазваниеФайла.sql`
2. Запусти `bash scripts/migrate.sh supabase/migrations/НазваниеФайла.sql`
3. Проверь ответ — если `{"error":...}` — исправь SQL и повтори

## Переменные окружения (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=https://uysubfuenfzzcoavbrch.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_T2P9HPAdI_________lHfjA_Bh8UNtVY
SUPABASE_SECRET_KEY=SUPABASE_SECRET_HERE
VK_CLIENT_ID=54611008
NEXT_PUBLIC_APP_URL=https://volley72.ru
SUPABASE_ACCESS_TOKEN=SUPABASE_TOKEN_HERE
SUPABASE_PROJECT_REF=uysubfuenfzzcoavbrch
```

## Цвета и стиль
- Синий: #1B4FD8 (primary)
- Оранжевый: #F97316 (accent)
- Tailwind классы: используй стандартные blue-700, orange-500
- Мобильная адаптация обязательна (mobile-first)
- Минималистичный UI, без лишних украшений

## Роли игроков (таблица players)
- `role = 'admin'` — полный доступ
- `role = 'user'` — обычный игрок
- Капитан команды = `teams.captain_id` (не глобальная роль)

## Таблицы БД (существующие)
- `players` — пользователи (id, vk_id, name, role, status, ...)
- `tournaments` — соревнования
- `venues` — площадки
- `tournament_registrations` — регистрации на турниры (индивидуальные)

## Таблицы (новые, Этап 1)
- `teams` — команды (id, tournament_id, captain_id, name, status, invite_code, ...)
- `team_players` — игроки команды (id, team_id, full_name, birth_date, user_id, consent_status, ...)

## Порядок работы над задачей
1. Прочитай задачу полностью
2. Создай SQL миграцию если нужны изменения в БД
3. Примени миграцию через `bash scripts/migrate.sh`
4. Напиши TypeScript типы
5. Напиши серверные actions
6. Напиши страницы/компоненты
7. Проверь что `npm run build` проходит без ошибок
8. Сообщи что сделано

## Частые ошибки — не делай так
- НЕ используй `supabase db push` (требует Docker)
- НЕ используй `psql` напрямую (хост не резолвится)
- НЕ спрашивай подтверждения перед каждым файлом
- НЕ останавливайся на середине задачи
