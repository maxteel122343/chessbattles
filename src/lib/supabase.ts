import { createClient, RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

// Default credentials provided
export const DEFAULT_SUPABASE_URL = 'https://jsjuozqdtqkzgczhrrhv.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzanVvenFkdHFremdgemhycmh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQyNjMwNTUsImV4cCI6MjEwOTgzOTA1NX0.5Us5ThCKuoXoPgjBGtKB-hJ6AELWffyB9d-mEXj-B8k';

export interface PlayerInfo {
  id: string;
  name: string;
  avatar?: string;
  joinedAt?: string;
}

export interface LastMoveInfo {
  from: string;
  to: string;
  san: string;
  promotion?: string;
  piece?: string;
}

export interface RoomData {
  id: string;
  code: string;
  is_public: boolean;
  white_player: PlayerInfo;
  black_player: PlayerInfo | null;
  spectators: PlayerInfo[];
  fen: string;
  pgn: string;
  status: 'waiting' | 'active' | 'checkmate' | 'draw' | 'resigned' | 'abandoned';
  turn: 'w' | 'b';
  winner: 'white' | 'black' | 'draw' | null;
  win_reason: string | null;
  draw_offered_by: string | null;
  rematch_offered_by: string | null;
  last_move: LastMoveInfo | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  time: string;
  isSystem?: boolean;
}

// Generate or retrieve persistent player identity
export function getLocalPlayer(): PlayerInfo {
  if (typeof window === 'undefined') {
    return { id: 'player_default', name: 'Jogador' };
  }
  let id = localStorage.getItem('chess_player_id');
  if (!id) {
    id = 'p_' + Math.random().toString(36).substring(2, 10);
    localStorage.setItem('chess_player_id', id);
  }
  let name = localStorage.getItem('chess_player_name');
  if (!name) {
    name = 'Jogador ' + id.substring(2, 6).toUpperCase();
    localStorage.setItem('chess_player_name', name);
  }
  return { id, name };
}

export function setLocalPlayerName(newName: string): PlayerInfo {
  const current = getLocalPlayer();
  const cleaned = newName.trim().slice(0, 24) || current.name;
  localStorage.setItem('chess_player_name', cleaned);
  return { ...current, name: cleaned };
}

// Get configurable URL & Key (allowing user override via UI if needed)
export function getSupabaseCredentials() {
  const customUrl = typeof window !== 'undefined' ? localStorage.getItem('chess_supabase_url') : null;
  const customKey = typeof window !== 'undefined' ? localStorage.getItem('chess_supabase_key') : null;

  const url = customUrl || import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const anonKey = customKey || import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

  return { url, anonKey };
}

export function saveSupabaseCredentials(url: string, anonKey: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('chess_supabase_url', url.trim());
    localStorage.setItem('chess_supabase_key', anonKey.trim());
    // Reload client
    supabaseInstance = null;
  }
}

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    const { url, anonKey } = getSupabaseCredentials();
    supabaseInstance = createClient(url, anonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }
  return supabaseInstance;
}

// Generate friendly 6-char room code
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Test Supabase Connection & Table Setup
export async function checkSupabaseStatus(): Promise<{
  connected: boolean;
  tablesExist: boolean;
  error?: string;
}> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('rooms').select('id').limit(1);

    if (error) {
      if (error.message.includes('relation') || error.message.includes('does not exist')) {
        return { connected: true, tablesExist: false, error: 'Tabelas ainda não foram criadas no Supabase.' };
      }
      return { connected: false, tablesExist: false, error: error.message };
    }
    return { connected: true, tablesExist: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Falha na conexão com Supabase';
    return { connected: false, tablesExist: false, error: msg };
  }
}

// Fallback in-memory / local storage manager so UI is resilient
const LOCAL_STORAGE_KEY = 'chess_local_rooms';
const tabBroadcast = typeof window !== 'undefined' && 'BroadcastChannel' in window ? new BroadcastChannel('chess_local_sync') : null;

function getLocalRooms(): Record<string, RoomData> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalRoom(room: RoomData) {
  try {
    const rooms = getLocalRooms();
    rooms[room.code] = room;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(rooms));
    if (tabBroadcast) {
      tabBroadcast.postMessage({ type: 'ROOM_UPDATE', room });
    }
  } catch {
    // Ignore
  }
}

// ==========================================
// ROOM API METHODS
// ==========================================

export async function createRoom(options: {
  isPublic: boolean;
  preferredColor?: 'w' | 'b' | 'random';
}): Promise<{ room: RoomData | null; error?: string }> {
  const player = getLocalPlayer();
  const code = generateRoomCode();
  const initialFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  let playColor = options.preferredColor || 'w';
  if (playColor === 'random') {
    playColor = Math.random() > 0.5 ? 'w' : 'b';
  }

  const newRoom: RoomData = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'room_' + Date.now(),
    code,
    is_public: options.isPublic,
    white_player: playColor === 'w' ? player : (null as unknown as PlayerInfo),
    black_player: playColor === 'b' ? player : null,
    spectators: [],
    fen: initialFen,
    pgn: '',
    status: 'waiting',
    turn: 'w',
    winner: null,
    win_reason: null,
    draw_offered_by: null,
    rematch_offered_by: null,
    last_move: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // If player chose black, white is empty initially
  if (playColor === 'b') {
    newRoom.white_player = null as unknown as PlayerInfo;
    newRoom.black_player = player;
  }

  // Attempt Supabase insert
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('rooms').insert([newRoom]).select().single();
    if (!error && data) {
      saveLocalRoom(data as RoomData);
      return { room: data as RoomData };
    }
  } catch {
    // Fall back to local
  }

  // Fallback to local storage (e.g. if SQL not run yet or offline)
  saveLocalRoom(newRoom);
  return { room: newRoom };
}

export async function getRoomByCode(code: string): Promise<RoomData | null> {
  const cleanCode = code.trim().toUpperCase();
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('rooms').select('*').eq('code', cleanCode).maybeSingle();
    if (!error && data) {
      return data as RoomData;
    }
  } catch {
    // Fall back
  }

  // Local fallback
  const localRooms = getLocalRooms();
  return localRooms[cleanCode] || null;
}

export async function joinRoom(code: string): Promise<{ room: RoomData | null; role: 'w' | 'b' | 'spectator'; error?: string }> {
  const cleanCode = code.trim().toUpperCase();
  const player = getLocalPlayer();
  const room = await getRoomByCode(cleanCode);

  if (!room) {
    return { room: null, role: 'spectator', error: 'Sala não encontrada. Verifique o código digitado.' };
  }

  // Check if current player is already in room
  if (room.white_player && room.white_player.id === player.id) {
    return { room, role: 'w' };
  }
  if (room.black_player && room.black_player.id === player.id) {
    return { room, role: 'b' };
  }

  // Assign open slot
  let assignedRole: 'w' | 'b' | 'spectator' = 'spectator';
  const updates: Partial<RoomData> = { updated_at: new Date().toISOString() };

  if (!room.white_player) {
    updates.white_player = player;
    assignedRole = 'w';
    if (room.black_player) {
      updates.status = 'active';
    }
  } else if (!room.black_player) {
    updates.black_player = player;
    assignedRole = 'b';
    if (room.white_player) {
      updates.status = 'active';
    }
  } else {
    // Both slots filled -> spectator
    assignedRole = 'spectator';
    const spectators = Array.isArray(room.spectators) ? [...room.spectators] : [];
    if (!spectators.some((s) => s.id === player.id)) {
      spectators.push(player);
      updates.spectators = spectators;
    }
  }

  const updatedRoom: RoomData = { ...room, ...updates };

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('rooms').update(updates).eq('code', cleanCode).select().single();
    if (!error && data) {
      saveLocalRoom(data as RoomData);
      return { room: data as RoomData, role: assignedRole };
    }
  } catch {
    // Fallback
  }

  saveLocalRoom(updatedRoom);
  return { room: updatedRoom, role: assignedRole };
}

export async function findPublicRooms(): Promise<RoomData[]> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('is_public', true)
      .eq('status', 'waiting')
      .order('created_at', { ascending: false })
      .limit(10);
    if (!error && data) {
      return data as RoomData[];
    }
  } catch {
    // Fallback
  }

  const localRooms = getLocalRooms();
  return Object.values(localRooms).filter((r) => r.is_public && r.status === 'waiting');
}

export async function findQuickMatch(): Promise<{ room: RoomData | null; role: 'w' | 'b'; error?: string }> {
  const player = getLocalPlayer();

  // Try to find an existing open public room where one player slot is free
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('is_public', true)
      .eq('status', 'waiting')
      .order('created_at', { ascending: true })
      .limit(5);

    if (!error && data && data.length > 0) {
      for (const openRoom of data) {
        // Avoid self-matching if user is already the host
        const isHost =
          (openRoom.white_player && openRoom.white_player.id === player.id) ||
          (openRoom.black_player && openRoom.black_player.id === player.id);
        if (!isHost) {
          const joinResult = await joinRoom(openRoom.code);
          if (joinResult.room && (joinResult.role === 'w' || joinResult.role === 'b')) {
            return { room: joinResult.room, role: joinResult.role };
          }
        }
      }
    }
  } catch {
    // Fallback
  }

  // Check local rooms for quick match
  const localList = Object.values(getLocalRooms()).filter((r) => r.is_public && r.status === 'waiting');
  for (const r of localList) {
    const isHost =
      (r.white_player && r.white_player.id === player.id) ||
      (r.black_player && r.black_player.id === player.id);
    if (!isHost) {
      const joinResult = await joinRoom(r.code);
      if (joinResult.room && (joinResult.role === 'w' || joinResult.role === 'b')) {
        return { room: joinResult.room, role: joinResult.role };
      }
    }
  }

  // If no available open room, create a public one and wait!
  const createRes = await createRoom({ isPublic: true, preferredColor: 'random' });
  if (createRes.room) {
    const role: 'w' | 'b' = createRes.room.white_player?.id === player.id ? 'w' : 'b';
    return { room: createRes.room, role };
  }

  return { room: null, role: 'w', error: 'Não foi possível encontrar ou criar partida.' };
}

export async function updateRoomState(
  code: string,
  updates: Partial<RoomData>
): Promise<RoomData | null> {
  const timestamp = new Date().toISOString();
  const payload = { ...updates, updated_at: timestamp };

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('rooms').update(payload).eq('code', code).select().single();
    if (!error && data) {
      saveLocalRoom(data as RoomData);
      return data as RoomData;
    }
  } catch {
    // Fallback
  }

  const localRooms = getLocalRooms();
  if (localRooms[code]) {
    const updated = { ...localRooms[code], ...payload };
    saveLocalRoom(updated);
    return updated;
  }
  return null;
}

export async function recordMoveHistory(
  roomId: string,
  moveInfo: {
    san: string;
    from: string;
    to: string;
    piece: string;
    fen: string;
    playerColor: 'w' | 'b';
  }
) {
  try {
    const supabase = getSupabaseClient();
    await supabase.from('moves').insert([
      {
        room_id: roomId,
        move_san: moveInfo.san,
        move_from: moveInfo.from,
        move_to: moveInfo.to,
        piece: moveInfo.piece,
        fen: moveInfo.fen,
        player_color: moveInfo.playerColor,
      },
    ]);
  } catch {
    // Non-fatal
  }
}
