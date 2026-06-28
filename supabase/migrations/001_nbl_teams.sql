-- =====================================================
-- Volley72 — NBL Кубок, Этап 1: Приём заявок команд
-- =====================================================

-- 1. Расширяем таблицу tournaments
ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS discipline text NOT NULL DEFAULT 'classic'
    CHECK (discipline IN ('classic', 'beach')),
  ADD COLUMN IF NOT EXISTS registration_deadline timestamptz,
  ADD COLUMN IF NOT EXISTS roster_min integer NOT NULL DEFAULT 6,
  ADD COLUMN IF NOT EXISTS roster_max integer NOT NULL DEFAULT 14,
  ADD COLUMN IF NOT EXISTS regulations_pdf_url text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'registration_open'
    CHECK (status IN ('registration_open', 'registration_closed', 'in_progress', 'finished'));

-- 2. Таблица команд
CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  captain_id uuid NOT NULL REFERENCES players(id) ON DELETE RESTRICT,
  name text NOT NULL,
  discipline text NOT NULL DEFAULT 'classic'
    CHECK (discipline IN ('classic', 'beach')),
  contacts text,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'paid', 'confirmed', 'rejected')),
  invite_code text UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Таблица игроков команды
CREATE TABLE IF NOT EXISTS team_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  birth_date date,
  user_id uuid REFERENCES players(id) ON DELETE SET NULL,
  role text NOT NULL DEFAULT 'player'
    CHECK (role IN ('player', 'substitute')),
  consent_status text NOT NULL DEFAULT 'pending'
    CHECK (consent_status IN ('pending', 'signed', 'offline')),
  consent_at timestamptz,
  consent_user_id uuid REFERENCES players(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Индексы
CREATE INDEX IF NOT EXISTS teams_tournament_id_idx ON teams(tournament_id);
CREATE INDEX IF NOT EXISTS teams_captain_id_idx ON teams(captain_id);
CREATE INDEX IF NOT EXISTS teams_invite_code_idx ON teams(invite_code);
CREATE INDEX IF NOT EXISTS team_players_team_id_idx ON team_players(team_id);
CREATE INDEX IF NOT EXISTS team_players_user_id_idx ON team_players(user_id);

-- 5. updated_at auto-update
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS teams_updated_at ON teams;
CREATE TRIGGER teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 6. RLS
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_players ENABLE ROW LEVEL SECURITY;

-- teams: все могут читать submitted/paid/confirmed
CREATE POLICY "teams_public_read" ON teams
  FOR SELECT USING (status IN ('submitted', 'paid', 'confirmed'));

-- teams: капитан видит свои черновики
CREATE POLICY "teams_captain_read_draft" ON teams
  FOR SELECT USING (captain_id = auth.uid()::uuid);

-- teams: зарегистрированный игрок может создать команду
CREATE POLICY "teams_insert" ON teams
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- teams: капитан редактирует до дедлайна
CREATE POLICY "teams_captain_update" ON teams
  FOR UPDATE USING (
    captain_id = auth.uid()::uuid
    AND EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_id
      AND (t.registration_deadline IS NULL OR t.registration_deadline > now())
    )
  );

-- team_players: читать может участник команды или все (по submitted+)
CREATE POLICY "team_players_read" ON team_players
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = team_id
      AND (
        t.captain_id = auth.uid()::uuid
        OR t.status IN ('submitted', 'paid', 'confirmed')
        OR user_id = auth.uid()::uuid
      )
    )
  );

-- team_players: капитан добавляет игроков
CREATE POLICY "team_players_insert" ON team_players
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = team_id AND t.captain_id = auth.uid()::uuid
    )
  );

-- team_players: игрок подписывает своё согласие
CREATE POLICY "team_players_consent_update" ON team_players
  FOR UPDATE USING (user_id = auth.uid()::uuid)
  WITH CHECK (user_id = auth.uid()::uuid);

-- 7. Тестовый турнир NBL Кубок (если нет ни одного)
INSERT INTO tournaments (
  name,
  discipline,
  registration_deadline,
  roster_min,
  roster_max,
  status
)
SELECT
  'NBL Кубок 2025',
  'classic',
  now() + interval '30 days',
  6,
  14,
  'registration_open'
WHERE NOT EXISTS (
  SELECT 1 FROM tournaments WHERE name = 'NBL Кубок 2025'
);
