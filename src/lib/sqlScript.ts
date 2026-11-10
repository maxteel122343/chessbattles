// SQL Script and instructions for creating Supabase tables and enabling Realtime

export const SUPABASE_SQL_SCRIPT = `-- =======================================================
-- XADREZ MULTIPLAYER EM TEMPO REAL - SUPABASE DDL
-- Execute este script no Supabase SQL Editor:
-- https://supabase.com/dashboard/project/jsjuozqdtqkzgczhrrhv/sql/new
-- =======================================================

-- 1. Criação da tabela de salas (rooms)
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  is_public BOOLEAN DEFAULT false,
  white_player JSONB NOT NULL,
  black_player JSONB DEFAULT NULL,
  spectators JSONB DEFAULT '[]'::JSONB,
  fen TEXT NOT NULL DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  pgn TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'waiting', -- 'waiting', 'active', 'checkmate', 'draw', 'resigned', 'abandoned'
  turn TEXT NOT NULL DEFAULT 'w',         -- 'w' ou 'b'
  winner TEXT DEFAULT NULL,               -- 'white', 'black', 'draw'
  win_reason TEXT DEFAULT NULL,           -- 'checkmate', 'resignation', 'stalemate', 'draw_agreement'
  draw_offered_by TEXT DEFAULT NULL,
  rematch_offered_by TEXT DEFAULT NULL,
  last_move JSONB DEFAULT NULL,           -- { from, to, san, promotion }
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::TEXT, now()) NOT NULL
);

-- 2. Criação da tabela de histórico de jogadas (moves)
CREATE TABLE IF NOT EXISTS public.moves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  move_san TEXT NOT NULL,
  move_from TEXT NOT NULL,
  move_to TEXT NOT NULL,
  piece TEXT NOT NULL,
  fen TEXT NOT NULL,
  player_color TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::TEXT, now()) NOT NULL
);

-- 3. Índices para performance
CREATE INDEX IF NOT EXISTS idx_rooms_code ON public.rooms(code);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON public.rooms(status);
CREATE INDEX IF NOT EXISTS idx_rooms_is_public ON public.rooms(is_public);
CREATE INDEX IF NOT EXISTS idx_moves_room_id ON public.moves(room_id);

-- 4. Habilitar Row Level Security (RLS)
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moves ENABLE ROW LEVEL SECURITY;

-- 5. Criar Políticas de Acesso Anônimo (Permitir jogar sem login obrigatório)
DROP POLICY IF EXISTS "Public access on rooms" ON public.rooms;
CREATE POLICY "Public access on rooms"
  ON public.rooms
  FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public access on moves" ON public.moves;
CREATE POLICY "Public access on moves"
  ON public.moves
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 6. Habilitar Supabase Realtime para sincronização instantânea
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'rooms'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'moves'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.moves;
  END IF;
END $$;
`;

export const SUPABASE_INSTRUCTIONS = [
  'Acesse seu painel do Supabase no projeto jsjuozqdtqkzgczhrrhv.',
  'Clique no menu lateral esquerdo em "SQL Editor".',
  'Clique em "New query" (Nova consulta).',
  'Cole o script SQL acima e clique no botão verde "Run" (Executar).',
  'Pronto! As tabelas "rooms", "moves" e o Supabase Realtime estarão 100% configurados para o xadrez.'
];
