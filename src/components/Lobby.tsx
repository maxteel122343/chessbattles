import React, { useState, useEffect } from 'react';
import {
  createRoom,
  joinRoom,
  findQuickMatch,
  findPublicRooms,
  RoomData,
  getLocalPlayer,
} from '../lib/supabase';
import {
  Swords,
  Users,
  KeyRound,
  Copy,
  Check,
  Share2,
  Play,
  RotateCw,
  Globe,
  Lock,
  ArrowRight,
  ShieldAlert,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { ChessPiece } from './ChessPiece';

interface LobbyProps {
  onEnterRoom: (code: string, role: 'w' | 'b' | 'spectator') => void;
  onOpenSqlModal: () => void;
  onOpenSettings: () => void;
  supabaseStatus: {
    connected: boolean;
    tablesExist: boolean;
    error?: string;
  };
}

export const Lobby: React.FC<LobbyProps> = ({
  onEnterRoom,
  onOpenSqlModal,
  onOpenSettings,
  supabaseStatus,
}) => {
  const [player, setPlayer] = useState(getLocalPlayer());

  // Join by code input
  const [joinCode, setJoinCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Quick Match state
  const [quickMatchLoading, setQuickMatchLoading] = useState(false);
  const [quickMatchStatus, setQuickMatchStatus] = useState<string | null>(null);

  // Create Room state
  const [createLoading, setCreateLoading] = useState(false);
  const [preferredColor, setPreferredColor] = useState<'w' | 'b' | 'random'>('random');
  const [isPublic, setIsPublic] = useState(true);

  // Newly created room popup
  const [createdRoom, setCreatedRoom] = useState<RoomData | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // Public rooms list
  const [publicRooms, setPublicRooms] = useState<RoomData[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);

  const refreshPublicRooms = async () => {
    setLoadingRooms(true);
    try {
      const rooms = await findPublicRooms();
      setPublicRooms(rooms);
    } catch {
      // Ignore
    } finally {
      setLoadingRooms(false);
    }
  };

  useEffect(() => {
    refreshPublicRooms();
    const interval = setInterval(refreshPublicRooms, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleJoin = async (codeToJoin?: string) => {
    const code = (codeToJoin || joinCode).trim().toUpperCase();
    if (!code) {
      setJoinError('Por favor, digite o código da sala.');
      return;
    }
    setJoinLoading(true);
    setJoinError(null);

    const res = await joinRoom(code);
    setJoinLoading(false);

    if (res.error || !res.room) {
      setJoinError(res.error || 'Erro ao entrar na sala.');
      return;
    }

    onEnterRoom(res.room.code, res.role);
  };

  const handleCreateRoom = async () => {
    setCreateLoading(true);
    const res = await createRoom({
      isPublic,
      preferredColor,
    });
    setCreateLoading(false);

    if (res.room) {
      setCreatedRoom(res.room);
    }
  };

  const handleQuickMatch = async () => {
    setQuickMatchLoading(true);
    setQuickMatchStatus('Procurando oponente online...');

    try {
      const res = await findQuickMatch();
      if (res.room) {
        setQuickMatchStatus('Partida encontrada! Conectando ao tabuleiro...');
        setTimeout(() => {
          onEnterRoom(res.room!.code, res.role);
        }, 500);
      } else {
        setQuickMatchStatus(res.error || 'Falha ao buscar partida.');
        setQuickMatchLoading(false);
      }
    } catch {
      setQuickMatchStatus('Erro na conexão. Tente novamente.');
      setQuickMatchLoading(false);
    }
  };

  const getInviteUrl = (code: string) => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}${window.location.pathname}?room=${code}`;
  };

  const copyToClipboard = async (text: string, type: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'code') {
        setCodeCopied(true);
        setTimeout(() => setCodeCopied(false), 2000);
      } else {
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
      }
    } catch {
      // Fallback
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Notice if Supabase tables haven't been created yet */}
      {!supabaseStatus.tablesExist && (
        <div className="p-4 rounded-2xl bg-amber-950/50 border border-amber-500/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
              <ShieldAlert size={22} />
            </div>
            <div>
              <div className="text-sm font-semibold text-amber-200">
                Supabase Realtime &amp; Tabelas
              </div>
              <p className="text-xs text-amber-300/80">
                Execute o script SQL no seu painel Supabase para habilitar banco em nuvem persistente.
              </p>
            </div>
          </div>
          <button
            onClick={onOpenSqlModal}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 text-black hover:bg-amber-400 transition-colors shadow-sm shrink-0"
          >
            Ver Script SQL &amp; Setup
          </button>
        </div>
      )}

      {/* Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-[#171d29] via-[#1c2230] to-[#141924] border border-gray-800 shadow-2xl p-6 sm:p-10">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 text-center md:text-left max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
              <Sparkles size={14} />
              Multiplayer Online em Tempo Real
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
              Desafie Mestres no <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500">Xadrez Online</span>
            </h1>
            <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
              Jogue partidas ao vivo com amigos por link/código ou encontre adversários aleatórios em tempo real com validação oficial de jogadas e sincronização instantânea.
            </p>

            {/* Quick Match Big CTA */}
            <div className="pt-2 flex flex-wrap items-center gap-3 justify-center md:justify-start">
              <button
                onClick={handleQuickMatch}
                disabled={quickMatchLoading}
                className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl text-sm font-bold text-black bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-300 hover:to-yellow-200 shadow-lg shadow-amber-500/25 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-75"
              >
                {quickMatchLoading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>{quickMatchStatus}</span>
                  </>
                ) : (
                  <>
                    <Swords size={20} />
                    <span>Partida Rápida / Match Online</span>
                  </>
                )}
              </button>

              <button
                onClick={onOpenSettings}
                className="px-4 py-3.5 rounded-2xl text-xs font-semibold text-gray-300 bg-gray-800/80 hover:bg-gray-800 border border-gray-700 transition-colors"
              >
                Jogando como: <strong className="text-white ml-1">{player.name}</strong>
              </button>
            </div>
          </div>

          {/* Visual Chess Pieces Showcase */}
          <div className="relative shrink-0 flex items-center justify-center p-6 bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20 rounded-2xl shadow-inner">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 sm:w-24 sm:h-24 filter drop-shadow-xl animate-bounce" style={{ animationDuration: '3s' }}>
                <ChessPiece type="k" color="w" />
              </div>
              <div className="w-14 h-14 sm:w-16 sm:h-16 filter drop-shadow-xl -mt-4">
                <ChessPiece type="q" color="b" />
              </div>
              <div className="w-16 h-16 sm:w-20 sm:h-20 filter drop-shadow-xl animate-bounce" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }}>
                <ChessPiece type="n" color="w" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Actions Grid (Create vs Join) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CARD 1: Criar Partida */}
        <div className="bg-[#171d29] border border-gray-800 rounded-3xl p-6 sm:p-7 shadow-xl flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Users size={22} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Criar Nova Partida</h2>
                <p className="text-xs text-gray-400">Gere um código de sala e convide amigos</p>
              </div>
            </div>

            {/* Color Preference */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
                Escolha suas peças:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'w', label: 'Brancas', piece: 'k', color: 'w' as const },
                  { id: 'random', label: 'Aleatório', piece: 'n', color: 'w' as const },
                  { id: 'b', label: 'Pretas', piece: 'k', color: 'b' as const },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setPreferredColor(opt.id as 'w' | 'b' | 'random')}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                      preferredColor === opt.id
                        ? 'bg-amber-500/20 border-amber-400 text-white shadow-md'
                        : 'bg-gray-900 border-gray-800 text-gray-400 hover:bg-gray-850 hover:text-gray-200'
                    }`}
                  >
                    <div className="w-8 h-8 flex items-center justify-center mb-1">
                      <ChessPiece type={opt.piece} color={opt.color} />
                    </div>
                    <span className="text-xs font-semibold">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Public vs Private toggle */}
            <div className="p-3.5 rounded-2xl bg-gray-900 border border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isPublic ? (
                  <Globe className="text-emerald-400" size={18} />
                ) : (
                  <Lock className="text-amber-400" size={18} />
                )}
                <div>
                  <div className="text-xs font-semibold text-white">
                    {isPublic ? 'Partida Pública' : 'Partida Privada'}
                  </div>
                  <div className="text-[11px] text-gray-400">
                    {isPublic ? 'Aparece na lista de salas abertas' : 'Apenas para quem tiver o link/código'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPublic(!isPublic)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isPublic ? 'bg-emerald-600' : 'bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isPublic ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          <button
            onClick={handleCreateRoom}
            disabled={createLoading}
            className="w-full py-3.5 px-4 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm shadow-lg shadow-amber-600/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-75"
          >
            {createLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Criando Sala...</span>
              </>
            ) : (
              <>
                <Sparkles size={18} />
                <span>Criar Partida</span>
              </>
            )}
          </button>
        </div>

        {/* CARD 2: Entrar em Partida */}
        <div className="bg-[#171d29] border border-gray-800 rounded-3xl p-6 sm:p-7 shadow-xl flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <KeyRound size={22} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Entrar em Partida</h2>
                <p className="text-xs text-gray-400">Digite o código de 6 dígitos que seu amigo enviou</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
                Código da Sala:
              </label>
              <div className="relative">
                <input
                  type="text"
                  maxLength={6}
                  value={joinCode}
                  onChange={(e) => {
                    setJoinCode(e.target.value.toUpperCase());
                    setJoinError(null);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                  placeholder="EX: 8KD9Z2"
                  className="w-full px-4 py-3.5 rounded-2xl bg-gray-900 border border-gray-700 text-center font-mono text-xl sm:text-2xl font-black text-amber-400 tracking-widest placeholder-gray-600 focus:outline-hidden focus:border-amber-400 uppercase transition-all"
                />
              </div>
              {joinError && (
                <p className="text-xs text-red-400 font-medium">{joinError}</p>
              )}
            </div>

            <div className="p-3 rounded-2xl bg-gray-900/60 border border-gray-800 text-xs text-gray-400 space-y-1">
              <span className="font-semibold text-gray-300 block">Dica:</span>
              <p>
                Você também pode abrir o link direto enviado pelo seu adversário para entrar automaticamente na sala!
              </p>
            </div>
          </div>

          <button
            onClick={() => handleJoin()}
            disabled={joinLoading || !joinCode.trim()}
            className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
          >
            {joinLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Entrando...</span>
              </>
            ) : (
              <>
                <ArrowRight size={18} />
                <span>Entrar na Partida</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Modal / Card when room is created */}
      {createdRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-lg bg-[#141822] border-2 border-amber-500/50 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Share2 size={30} />
            </div>

            <div>
              <h3 className="text-2xl font-black text-white">Sala Criada com Sucesso!</h3>
              <p className="text-xs sm:text-sm text-gray-300 mt-1">
                Compartilhe o código ou o link abaixo com seu adversário:
              </p>
            </div>

            {/* Room Code Big Box */}
            <div className="p-4 rounded-2xl bg-gray-900 border border-amber-500/30 flex items-center justify-between gap-4">
              <div className="text-left">
                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Código da Sala</span>
                <span className="text-2xl sm:text-3xl font-black font-mono text-amber-400 tracking-wider">
                  {createdRoom.code}
                </span>
              </div>
              <button
                onClick={() => copyToClipboard(createdRoom.code, 'code')}
                className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md"
              >
                {codeCopied ? <Check size={16} /> : <Copy size={16} />}
                <span>{codeCopied ? 'Copiado!' : 'Copiar Código'}</span>
              </button>
            </div>

            {/* Invite Link Box */}
            <div className="p-3.5 rounded-2xl bg-gray-900 border border-gray-800 text-left space-y-2">
              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Link Direto de Convite</span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={getInviteUrl(createdRoom.code)}
                  className="w-full text-xs font-mono text-gray-300 bg-black/40 px-3 py-2 rounded-lg border border-gray-800 truncate"
                />
                <button
                  onClick={() => copyToClipboard(getInviteUrl(createdRoom.code), 'link')}
                  className="px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white text-xs font-semibold shrink-0 flex items-center gap-1 border border-gray-700 transition-colors"
                >
                  {linkCopied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span>{linkCopied ? 'Copiado!' : 'Copiar Link'}</span>
                </button>
              </div>
            </div>

            {/* Share on WhatsApp */}
            <a
              href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                `⚔️ Vamos jogar xadrez agora! Entre na minha sala com o código ${createdRoom.code} ou acesse direto: ${getInviteUrl(createdRoom.code)}`
              )}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow-md"
            >
              <Share2 size={16} />
              <span>Convidar Amigo pelo WhatsApp</span>
            </a>

            {/* Enter Board Action */}
            <div className="pt-2">
              <button
                onClick={() => {
                  const role: 'w' | 'b' = createdRoom.white_player?.id === player.id ? 'w' : 'b';
                  onEnterRoom(createdRoom.code, role);
                }}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-300 hover:to-yellow-200 text-black font-extrabold text-sm shadow-xl flex items-center justify-center gap-2 transition-transform hover:scale-[1.01]"
              >
                <Play size={18} />
                <span>Entrar no Tabuleiro e Aguardar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Public Rooms Section */}
      <div className="bg-[#171d29] border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Globe size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Salas Públicas Abertas</h2>
              <p className="text-xs text-gray-400">Entre em partidas criadas por outros jogadores</p>
            </div>
          </div>
          <button
            onClick={refreshPublicRooms}
            disabled={loadingRooms}
            className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
            title="Atualizar lista de salas"
          >
            <RotateCw size={14} className={loadingRooms ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>
        </div>

        {publicRooms.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-gray-900/60 border border-gray-800 text-gray-400 space-y-3">
            <Users size={32} className="mx-auto text-gray-600" />
            <p className="text-xs sm:text-sm">
              Nenhuma sala pública aberta no momento. Que tal criar uma ou clicar em "Partida Rápida"?
            </p>
            <button
              onClick={handleCreateRoom}
              className="px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-semibold hover:bg-amber-500/30 transition-colors"
            >
              Criar Sala Pública Agora
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {publicRooms.map((room) => {
              const host = room.white_player || room.black_player;
              const hostColor = room.white_player ? 'Brancas' : 'Pretas';
              return (
                <div
                  key={room.code}
                  className="p-4 rounded-2xl bg-gray-900 border border-gray-800 hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-3 shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">
                      {room.code}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Aguardando
                    </span>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-white">
                      Host: {host?.name || 'Jogador'}
                    </div>
                    <div className="text-[11px] text-gray-400">
                      Jogando de {hostColor}
                    </div>
                  </div>

                  <button
                    onClick={() => handleJoin(room.code)}
                    className="w-full py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Play size={14} />
                    <span>Jogar Agora</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
