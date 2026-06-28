# ТЗ — Этап 1: Приём заявок команд (NBL Кубок, классика)

## Цель этапа
Капитан подаёт заявку команды через сайт. Организатор видит все заявки в одном месте. Игроки подписывают согласие в ЛК.

## Ключевое правило
Подача заявки НЕ заблокирована подписями игроков. Капитан подаёт состав сразу (ФИО). Согласие каждого игрока — асинхронный статус. Админ может проставить вручную (офлайн).

## Роли
- Гость: только просмотр турниров
- Игрок: подать заявку, подписать согласие за себя
- Капитан: создавший заявку (teams.captain_id), редактирует состав до дедлайна
- Админ: меняет статусы, редактирует любой состав, ставит офлайн-согласие

## Таблицы БД (уже созданы)
tournaments: добавлены поля discipline, registration_deadline, roster_min(6), roster_max(14), regulations_pdf_url, status
teams: id, tournament_id, captain_id, name, discipline, contacts, status, invite_code, created_at, updated_at
team_players: id, team_id, full_name, birth_date, user_id, role, consent_status, consent_at, consent_user_id

## Статусы заявки
- draft — черновик (только капитан видит)
- submitted — отправлена админу
- paid — оплата подтверждена (ставит админ вручную)
- confirmed — заявка принята
- rejected — отклонена

## Что реализовать

### 1. lib/types/teams.ts
TypeScript типы для Team, TeamPlayer, TeamStatus, ConsentStatus

### 2. lib/actions/teams.ts
- createTeam(tournamentId, data) — создать черновик
- submitTeam(teamId) — отправить (draft → submitted)
- updateTeamRoster(teamId, players) — обновить состав до дедлайна
- signConsent(teamPlayerId) — подписать согласие (consent_status = signed)
- adminUpdateStatus(teamId, status) — сменить статус (только admin)
- adminSetOfflineConsent(teamPlayerId) — проставить offline согласие
- getTeamsByTournament(tournamentId) — список для админа

### 3. app/tournaments/[id]/page.tsx
Страница турнира: описание + кнопка «Подать заявку» (только для залогиненных)

### 4. app/tournaments/[id]/apply/page.tsx
Форма заявки:
- Название команды (обязательное)
- Контакты капитана
- Список игроков: строки ФИО + дата рождения (мин 6, макс 14)
- Галочка «ознакомлен с положением»
- Кнопки: «Сохранить черновик» / «Отправить заявку»

### 5. app/tournaments/[id]/my-team/page.tsx
ЛК капитана:
- Состав с индикаторами consent_status по каждому игроку
- Статус заявки
- Invite-ссылка для игроков
- Редактирование состава до дедлайна

### 6. app/invite/[code]/page.tsx
Страница по invite_code:
- Вход через VK если не залогинен
- Игрок находит себя в составе
- Подтверждает ФИО + дату рождения
- Ставит согласие → consent_status = signed

### 7. app/admin/tournaments/[id]/teams/page.tsx
Админ-панель заявок:
- Список всех команд со статусами
- Кнопки смены статуса
- Счётчик подписей по каждой команде (X из Y подписали)
- Кнопка офлайн-согласия по каждому игроку

## Что НЕ делать в этом этапе
- Онлайн-оплата
- Турнирная сетка и расписание
- Рейтинги и статистика
- СМС-уведомления
