import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import {
  DEFAULT_SUPABASE_URL,
  DEFAULT_SUPABASE_ANON_KEY,
  generateRoomCode,
} from '../src/lib/supabase.ts';
import { applyChessMove, getCapturedPieces } from '../src/lib/chessEngine.ts';
import { SUPABASE_SQL_SCRIPT } from '../src/lib/sqlScript.ts';

test('Supabase default credentials are fully configured with provided project ref', () => {
  assert.equal(DEFAULT_SUPABASE_URL, 'https://jsjuozqdtqkzgczhrrhv.supabase.co');
  assert.ok(DEFAULT_SUPABASE_ANON_KEY.startsWith('eyJhbGciOiJIUzI1Ni'));
});

test('generateRoomCode produces unique 6-character uppercase codes', () => {
  const code1 = generateRoomCode();
  const code2 = generateRoomCode();
  assert.equal(code1.length, 6);
  assert.equal(code2.length, 6);
  assert.match(code1, /^[A-Z0-9]{6}$/);
  assert.notEqual(code1, code2);
});

test('Chess engine validates legal moves, check, and captures accurately', () => {
  const initialFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  
  // White plays e2 -> e4
  const res1 = applyChessMove(initialFen, 'e2', 'e4');
  assert.equal(res1.success, true);
  assert.equal(res1.san, 'e4');
  assert.equal(res1.turn, 'b');

  // Black plays e7 -> e5
  const res2 = applyChessMove(res1.fen, 'e7', 'e5');
  assert.equal(res2.success, true);
  assert.equal(res2.san, 'e5');
  assert.equal(res2.turn, 'w');

  // Illegal move test (King cannot leap across board)
  const illegal = applyChessMove(res2.fen, 'e1', 'e7');
  assert.equal(illegal.success, false);
});

test('Captured pieces calculation works properly', () => {
  const fenWithCaptures = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';
  const captured = getCapturedPieces(fenWithCaptures);
  assert.ok(Array.isArray(captured.white));
  assert.ok(Array.isArray(captured.black));
});

test('SQL script includes rooms, moves, RLS policies and realtime publications', () => {
  assert.ok(SUPABASE_SQL_SCRIPT.includes('CREATE TABLE IF NOT EXISTS public.rooms'));
  assert.ok(SUPABASE_SQL_SCRIPT.includes('CREATE TABLE IF NOT EXISTS public.moves'));
  assert.ok(SUPABASE_SQL_SCRIPT.includes('ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms'));
  assert.ok(SUPABASE_SQL_SCRIPT.includes('ALTER PUBLICATION supabase_realtime ADD TABLE public.moves'));
});
