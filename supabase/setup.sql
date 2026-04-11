-- ╔══════════════════════════════════════════════════════════════╗
-- ║  VANTAGEM.AI — Supabase Setup                               ║
-- ║  Cole este arquivo inteiro no SQL Editor do Supabase        ║
-- ╚══════════════════════════════════════════════════════════════╝

-- Tabela que guarda os updates de conteúdo (videoId + materiais)
-- A estrutura das aulas fica nos arquivos JSON do repositório.
-- Quando o admin salva um vídeo, grava aqui.
-- Quando o portal abre, busca daqui e sobrepõe os dados.

CREATE TABLE IF NOT EXISTS lesson_updates (
  id          TEXT        PRIMARY KEY,          -- ex: L01, A01, B01, V01
  track       TEXT        NOT NULL,             -- setter | partner | builder | vantagemsys
  video_id    TEXT        NOT NULL DEFAULT '',
  material    TEXT[]      NOT NULL DEFAULT '{}',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Atualiza updated_at automaticamente a cada save
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS lesson_updates_updated_at ON lesson_updates;
CREATE TRIGGER lesson_updates_updated_at
  BEFORE UPDATE ON lesson_updates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Segurança: qualquer visitante pode LER, só admin autenticado pode ESCREVER
ALTER TABLE lesson_updates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leitura publica" ON lesson_updates;
CREATE POLICY "leitura publica" ON lesson_updates
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "escrita autenticada" ON lesson_updates;
CREATE POLICY "escrita autenticada" ON lesson_updates
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
