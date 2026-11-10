import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Chess } from 'chess.js';
import confetti from 'canvas-confetti';
import {
  RoomData,
  PlayerInfo,
  ChatMessage,
  getLocalPlayer,
  getRoomByCode,
  updateRoomState,
  recordMoveHistory,
  getSupabaseClient,
  LastMoveInfo,
} from '../lib/supabase';
import {
  applyChessMove,
  getCapturedPieces,
  CapturedPieces,
} from '../lib/chessEngine';
import { soundSystem } from '../lib/audio';
import { ChessBoard } from './ChessBoard';
import { ChessPiece } from './ChessPiece';
import {
  Copy,
  Check,
  Share2,
  ArrowLeft,
  RotateCcw,
  Flag,
  Handshake,
  MessageSquare,
  History,
  Info,
  Send,
  Users,
  Trophy,
  Volume2,
  VolumeX,
  Swords,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { RealtimeChannel } from '@supabase/supabase-js';

interface GameRoomProps {
  roomCode: string;
  initialRole: 'w' | 'b' | 'spectator';
  onLeave: () => void;
  onOpenSqlModal: () => void;
}

export const GameRoom: React.FC<GameRoomProps> = ({
  roomCode,
  initialRole,
  onLeave,
  onOpenSqlModal,
}) => {
  const localPlayer = getLocalPlayer();
  const [room, setRoom] = useState<RoomData | null>(null);
  const [playerRole, setPlayerRole] = useState<'w' | 'b' | 'spectator'>(initialRole);
  const [orientation, setOrientation] = useState<'w' | 'b'>(initialRole === 'b' ? 'b' : 'w');

  // Game state
  const [fen, setFen] = useState<string>('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  const [lastMove, setLastMove] = useState<LastMoveInfo | null>(null);
  const [status, setStatus] = useState<RoomData['status']>('waiting');
  const [turn, setTurn] = useState<'w' | 'b'>('w');
  const [winner, setWinner] = useState<string | null>(null);
  const [winReason, setWinReason] = useState<string | null>(null);
  const [moveList, setMoveList] = useState<{ san: string; playerColor: 'w' | 'b' }[]>([]);

  // Captured pieces and material
  const [captured, setCaptured] = useState<CapturedPieces>({
    white: [],
    black: [],
    whiteScore: 0,
    blackScore: 0,
  });

  // Chat & Tabs
  const [activeTab, setActiveTab] = useState<'moves' | 'chat' | 'info'>('moves');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const movesScrollRef = useRef<HTMLDivElement>(null);

  // In-game offers
  const [drawOfferReceived, setDrawOfferReceived] = useState<boolean>(false);
  const [drawOfferSent, setDrawOfferSent] = useState<boolean>(false);
  const [rematchOfferReceived, setRematchOfferReceived] = useState<boolean>(false);
  const [rematchOfferSent, setRematchOfferSent] = useState<boolean>(false);

  // Opponent presence
  const [opponentOnline, setOpponentOnline] = useState<boolean>(false);
  const [copyCodeSuccess, setCopyCodeSuccess] = useState<boolean>(false);
  const [copyLinkSuccess, setCopyLinkSuccess] = useState<boolean>(false);

  // Sound toggle
  const [soundOn, setSoundOn] = useState<boolean>(soundSystem.isEnabled());

  // Realtime channel reference
  const channelRef = useRef<RealtimeChannel | null>(null);
  const tabChannelRef = useRef<BroadcastChannel | null>(null);

  // Determine Opponent info
  const whitePlayer: PlayerInfo | null = room?.white_player || null;
  const blackPlayer: PlayerInfo | null = room?.black_player || null;
  const opponent: PlayerInfo | null = playerRole === 'w' ? blackPlayer : whitePlayer;
  const myPlayer: PlayerInfo | null = playerRole === 'w' ? whitePlayer : blackPlayer;

  // Sound effects helper
  const playSoundEffect = useCallback((type: 'move' | 'capture' | 'check' | 'victory' | 'defeat' | 'notify') => {
    switch (type) {
      case 'move':
        soundSystem.playMove();
        break;
      case 'capture':
        soundSystem.playCapture();
        break;
      case 'check':
        soundSystem.playCheck();
        break;
      case 'victory':
        soundSystem.playVictory();
        break;
      case 'defeat':
        soundSystem.playDefeat();
        break;
      case 'notify':
        soundSystem.playNotify();
        break;
    }
  }, []);

  // Sync state from room data
  const applyRoomState = useCallback((r: RoomData) => {
    setRoom(r);
    setFen(r.fen);
    setTurn(r.turn);
    setStatus(r.status);
    setWinner(r.winner);
    setWinReason(r.win_reason);
    setLastMove(r.last_move);
    setCaptured(getCapturedPieces(r.fen));

    // Determine role if not assigned or verify
    if (r.white_player && r.white_player.id === localPlayer.id) {
      setPlayerRole('w');
    } else if (r.black_player && r.black_player.id === localPlayer.id) {
      setPlayerRole('b');
    }

    // Check if opponent is present
    if (r.white_player && r.black_player) {
      setOpponentOnline(true);
    }
  }, [localPlayer.id]);

  // Initial Room fetch
  useEffect(() => {
    let isMounted = true;
    getRoomByCode(roomCode).then((r) => {
      if (isMounted && r) {
        applyRoomState(r);
        if (initialRole === 'b') {
          setOrientation('b');
        } else {
          setOrientation('w');
        }
      }
    });
    return () => {
      isMounted = false;
    };
  }, [roomCode, initialRole, applyRoomState]);

  // Setup Supabase Realtime Channel & Broadcast
  useEffect(() => {
    const supabase = getSupabaseClient();
    const channelName = `chess_room_${roomCode.toLowerCase()}`;
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { ack: false, self: false },
        presence: { key: localPlayer.id },
      },
    });

    // 1. Broadcast Moves
    channel.on('broadcast', { event: 'move' }, ({ payload }) => {
      if (payload && payload.fen) {
        setFen(payload.fen);
        setTurn(payload.turn);
        setStatus(payload.status || 'active');
        setLastMove(payload.lastMove || null);
        setCaptured(getCapturedPieces(payload.fen));

        if (payload.winner) {
          setWinner(payload.winner);
          setWinReason(payload.winReason);
          if (
            (payload.winner === 'white' && playerRole === 'w') ||
            (payload.winner === 'black' && playerRole === 'b')
          ) {
            playSoundEffect('victory');
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
          } else if (payload.winner === 'draw') {
            playSoundEffect('defeat');
          } else {
            playSoundEffect('defeat');
          }
        } else if (payload.isCheck) {
          playSoundEffect('check');
        } else if (payload.isCapture) {
          playSoundEffect('capture');
        } else {
          playSoundEffect('move');
        }

        if (payload.san) {
          setMoveList((prev) => [...prev, { san: payload.san, playerColor: payload.playerColor }]);
        }
      }
    });

    // 2. Broadcast Chat
    channel.on('broadcast', { event: 'chat' }, ({ payload }) => {
      if (payload) {
        setChatMessages((prev) => [...prev, payload]);
        playSoundEffect('notify');
      }
    });

    // 3. Broadcast Draw Offer
    channel.on('broadcast', { event: 'draw_offer' }, ({ payload }) => {
      if (payload && payload.fromRole !== playerRole) {
        setDrawOfferReceived(true);
        playSoundEffect('notify');
      }
    });

    // 4. Broadcast Draw Response
    channel.on('broadcast', { event: 'draw_response' }, ({ payload }) => {
      setDrawOfferSent(false);
      if (payload.accepted) {
        setStatus('draw');
        setWinner('draw');
        setWinReason('Empate acordado entre os jogadores.');
        playSoundEffect('defeat');
      }
    });

    // 5. Broadcast Resignation
    channel.on('broadcast', { event: 'resign' }, ({ payload }) => {
      if (payload) {
        const winColor = payload.color === 'w' ? 'black' : 'white';
        setStatus('resigned');
        setWinner(winColor);
        setWinReason(`Vitória por desistência das ${payload.color === 'w' ? 'Brancas' : 'Pretas'}.`);

        if (
          (winColor === 'white' && playerRole === 'w') ||
          (winColor === 'black' && playerRole === 'b')
        ) {
          playSoundEffect('victory');
          confetti({ particleCount: 120, spread: 80 });
        } else {
          playSoundEffect('defeat');
        }
      }
    });

    // 6. Broadcast Rematch Offer
    channel.on('broadcast', { event: 'rematch_offer' }, ({ payload }) => {
      if (payload && payload.fromRole !== playerRole) {
        setRematchOfferReceived(true);
        playSoundEffect('notify');
      }
    });

    // 7. Broadcast Rematch Accept
    channel.on('broadcast', { event: 'rematch_accept' }, ({ payload }) => {
      setRematchOfferSent(false);
      setRematchOfferReceived(false);
      const initialFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      setFen(initialFen);
      setTurn('w');
      setStatus('active');
      setWinner(null);
      setWinReason(null);
      setLastMove(null);
      setMoveList([]);
      setCaptured({ white: [], black: [], whiteScore: 0, blackScore: 0 });
      // Invert roles on rematch
      setPlayerRole((prev) => (prev === 'w' ? 'b' : prev === 'b' ? 'w' : 'spectator'));
      setOrientation((prev) => (prev === 'w' ? 'b' : 'w'));
      playSoundEffect('move');
    });

    // 8. Presence Tracking
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const userCount = Object.keys(state).length;
      if (userCount >= 2) {
        setOpponentOnline(true);
      }
    });

    // 9. Postgres changes listener
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'rooms',
        filter: `code=eq.${roomCode.toUpperCase()}`,
      },
      (payload) => {
        if (payload.new) {
          applyRoomState(payload.new as RoomData);
        }
      }
    );

    // Subscribe and track presence
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          id: localPlayer.id,
          name: localPlayer.name,
          role: playerRole,
          onlineAt: new Date().toISOString(),
        });
      }
    });

    channelRef.current = channel;

    // Local tab broadcast channel for cross-tab testing
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const localBc = new BroadcastChannel(`chess_tab_${roomCode.toLowerCase()}`);
      localBc.onmessage = (event) => {
        const { type, data } = event.data || {};
        if (type === 'MOVE') {
          setFen(data.fen);
          setTurn(data.turn);
          setStatus(data.status);
          setLastMove(data.lastMove);
          setCaptured(getCapturedPieces(data.fen));
          if (data.san) {
            setMoveList((prev) => [...prev, { san: data.san, playerColor: data.playerColor }]);
          }
          if (data.winner) {
            setWinner(data.winner);
            setWinReason(data.winReason);
          }
        } else if (type === 'CHAT') {
          setChatMessages((prev) => [...prev, data]);
        }
      };
      tabChannelRef.current = localBc;
    }

    return () => {
      channel.unsubscribe();
      if (tabChannelRef.current) {
        tabChannelRef.current.close();
      }
    };
  }, [roomCode, localPlayer, playerRole, playSoundEffect, applyRoomState]);

  // Periodic room polling to ensure synchronization
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      const updated = await getRoomByCode(roomCode);
      if (updated) {
        if (!room || updated.updated_at !== room.updated_at) {
          applyRoomState(updated);
        }
      }
    }, 2500);

    return () => clearInterval(pollInterval);
  }, [roomCode, room, applyRoomState]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Auto-scroll move history
  useEffect(() => {
    if (movesScrollRef.current) {
      movesScrollRef.current.scrollTop = movesScrollRef.current.scrollHeight;
    }
  }, [moveList]);

  // Handle Player Move
  const handleMakeMove = async (from: string, to: string, promotion: string = 'q') => {
    // Basic validation: must be this player's turn
    if (playerRole === 'spectator' || playerRole !== turn) {
      return;
    }

    const moveResult = applyChessMove(fen, from, to, promotion);
    if (!moveResult.success) {
      return;
    }

    const newLastMove: LastMoveInfo = {
      from,
      to,
      san: moveResult.san,
      promotion: moveResult.san.includes('=') ? promotion : undefined,
    };

    // Immediate optimistic local update
    setFen(moveResult.fen);
    setTurn(moveResult.turn);
    setLastMove(newLastMove);
    setCaptured(getCapturedPieces(moveResult.fen));
    setMoveList((prev) => [...prev, { san: moveResult.san, playerColor: playerRole }]);

    let nextStatus: RoomData['status'] = 'active';
    let nextWinner: RoomData['winner'] = null;
    let nextReason: string | null = null;

    if (moveResult.isCheckmate) {
      nextStatus = 'checkmate';
      nextWinner = playerRole === 'w' ? 'white' : 'black';
      nextReason = 'Xeque-mate!';
      setWinner(nextWinner);
      setWinReason(nextReason);
      playSoundEffect('victory');
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    } else if (moveResult.isDraw || moveResult.isStalemate) {
      nextStatus = 'draw';
      nextWinner = 'draw';
      nextReason = moveResult.winReason || 'Empate.';
      setWinner('draw');
      setWinReason(nextReason);
      playSoundEffect('defeat');
    } else if (moveResult.isCheck) {
      playSoundEffect('check');
    } else if (moveResult.captured) {
      playSoundEffect('capture');
    } else {
      playSoundEffect('move');
    }

    setStatus(nextStatus);

    // Broadcast over Realtime channel
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'move',
        payload: {
          fen: moveResult.fen,
          turn: moveResult.turn,
          status: nextStatus,
          winner: nextWinner,
          winReason: nextReason,
          lastMove: newLastMove,
          san: moveResult.san,
          playerColor: playerRole,
          isCheck: moveResult.isCheck,
          isCapture: !!moveResult.captured,
        },
      });
    }

    // Broadcast cross-tab
    if (tabChannelRef.current) {
      tabChannelRef.current.postMessage({
        type: 'MOVE',
        data: {
          fen: moveResult.fen,
          turn: moveResult.turn,
          status: nextStatus,
          winner: nextWinner,
          winReason: nextReason,
          lastMove: newLastMove,
          san: moveResult.san,
          playerColor: playerRole,
        },
      });
    }

    // Persist to Supabase Database
    await updateRoomState(roomCode, {
      fen: moveResult.fen,
      turn: moveResult.turn,
      status: nextStatus,
      winner: nextWinner,
      win_reason: nextReason,
      last_move: newLastMove,
    });

    if (room?.id) {
      recordMoveHistory(room.id, {
        san: moveResult.san,
        from,
        to,
        piece: moveResult.san[0],
        fen: moveResult.fen,
        playerColor: playerRole,
      });
    }
  };

  // Send Chat message
  const handleSendChat = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = chatInput.trim();
    if (!text) return;

    const newMsg: ChatMessage = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      senderId: localPlayer.id,
      senderName: localPlayer.name,
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, newMsg]);
    setChatInput('');

    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'chat',
        payload: newMsg,
      });
    }

    if (tabChannelRef.current) {
      tabChannelRef.current.postMessage({
        type: 'CHAT',
        data: newMsg,
      });
    }
  };

  // Resign
  const handleResign = async () => {
    if (playerRole === 'spectator' || status !== 'active') return;
    const confirmResign = window.confirm('Tem certeza de que deseja abandonar esta partida?');
    if (!confirmResign) return;

    const winColor = playerRole === 'w' ? 'black' : 'white';
    setStatus('resigned');
    setWinner(winColor);
    setWinReason(`Vitória por desistência das ${playerRole === 'w' ? 'Brancas' : 'Pretas'}.`);
    playSoundEffect('defeat');

    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'resign',
        payload: { color: playerRole, playerId: localPlayer.id },
      });
    }

    await updateRoomState(roomCode, {
      status: 'resigned',
      winner: winColor,
      win_reason: `Desistência das ${playerRole === 'w' ? 'Brancas' : 'Pretas'}.`,
    });
  };

  // Draw offers
  const handleOfferDraw = () => {
    if (playerRole === 'spectator' || status !== 'active' || drawOfferSent) return;
    setDrawOfferSent(true);
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'draw_offer',
        payload: { fromRole: playerRole, playerId: localPlayer.id },
      });
    }
  };

  const handleRespondDraw = async (accept: boolean) => {
    setDrawOfferReceived(false);
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'draw_response',
        payload: { accepted: accept, fromRole: playerRole },
      });
    }

    if (accept) {
      setStatus('draw');
      setWinner('draw');
      setWinReason('Empate acordado entre ambos os jogadores.');
      playSoundEffect('defeat');

      await updateRoomState(roomCode, {
        status: 'draw',
        winner: 'draw',
        win_reason: 'Empate por acordo mútuo.',
      });
    }
  };

  // Rematch offers
  const handleOfferRematch = () => {
    setRematchOfferSent(true);
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'rematch_offer',
        payload: { fromRole: playerRole, playerId: localPlayer.id },
      });
    }
  };

  const handleAcceptRematch = async () => {
    setRematchOfferReceived(false);
    setRematchOfferSent(false);

    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'rematch_accept',
        payload: { accepted: true },
      });
    }

    const initialFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    setFen(initialFen);
    setTurn('w');
    setStatus('active');
    setWinner(null);
    setWinReason(null);
    setLastMove(null);
    setMoveList([]);
    setCaptured({ white: [], black: [], whiteScore: 0, blackScore: 0 });

    setPlayerRole((prev) => (prev === 'w' ? 'b' : prev === 'b' ? 'w' : 'spectator'));
    setOrientation((prev) => (prev === 'w' ? 'b' : 'w'));

    await updateRoomState(roomCode, {
      fen: initialFen,
      turn: 'w',
      status: 'active',
      winner: null,
      win_reason: null,
      last_move: null,
    });
  };

  // Copy helper
  const copyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopyCodeSuccess(true);
      setTimeout(() => setCopyCodeSuccess(false), 2000);
    } catch {
      // Ignore
    }
  };

  const copyRoomLink = async () => {
    try {
      const url = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
      await navigator.clipboard.writeText(url);
      setCopyLinkSuccess(true);
      setTimeout(() => setCopyLinkSuccess(false), 2000);
    } catch {
      // Ignore
    }
  };

  // Calculate material differences
  const whiteAdvantage = captured.whiteScore - captured.blackScore;
  const blackAdvantage = captured.blackScore - captured.whiteScore;

  // Turn description
  const isMyTurn = playerRole !== 'spectator' && turn === playerRole && status === 'active';

  return (
    <div className="w-full max-w-6xl mx-auto px-2 sm:px-4 py-4 sm:py-6 space-y-4 animate-in fade-in duration-200">
      {/* Top Navbar */}
      <div className="flex items-center justify-between gap-3 p-3 sm:p-4 rounded-2xl bg-[#171d29] border border-gray-800 shadow-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={onLeave}
            className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
            title="Sair da sala e voltar ao lobby"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-semibold uppercase">Sala</span>
              <span className="font-mono text-base sm:text-lg font-black text-amber-400 tracking-wider">
                {roomCode}
              </span>
              <button
                onClick={copyRoomCode}
                className="p-1 text-gray-400 hover:text-amber-400 transition-colors"
                title="Copiar código da sala"
              >
                {copyCodeSuccess ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              </button>
            </div>
            <span className="text-[11px] text-gray-400 hidden sm:inline">
              Multiplayer Supabase Realtime
            </span>
          </div>
        </div>

        {/* Room buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={copyRoomLink}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 transition-colors"
            title="Copiar link direto para convidar amigos"
          >
            {copyLinkSuccess ? <Check size={14} className="text-emerald-400" /> : <Share2 size={14} />}
            <span className="hidden sm:inline">{copyLinkSuccess ? 'Link Copiado!' : 'Convidar'}</span>
          </button>

          <button
            onClick={() => setOrientation((prev) => (prev === 'w' ? 'b' : 'w'))}
            className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
            title="Inverter perspectiva do tabuleiro"
          >
            <RotateCcw size={16} />
          </button>

          <button
            onClick={() => {
              const next = !soundOn;
              setSoundOn(next);
              soundSystem.setEnabled(next);
            }}
            className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
            title={soundOn ? 'Desativar Sons' : 'Ativar Sons'}
          >
            {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
        </div>
      </div>

      {/* Draw Offer Notification Modal / Toast */}
      {drawOfferReceived && (
        <div className="p-4 rounded-2xl bg-amber-950/80 border-2 border-amber-500/60 shadow-xl flex items-center justify-between gap-4 animate-in slide-in-from-top">
          <div className="flex items-center gap-3">
            <Handshake className="text-amber-400 shrink-0" size={24} />
            <div>
              <h4 className="text-sm font-bold text-white">Proposta de Empate!</h4>
              <p className="text-xs text-amber-200/90">Seu adversário propôs encerrar a partida em empate.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleRespondDraw(true)}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors"
            >
              Aceitar Empate
            </button>
            <button
              onClick={() => handleRespondDraw(false)}
              className="px-3.5 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold text-xs transition-colors"
            >
              Recusar
            </button>
          </div>
        </div>
      )}

      {/* Rematch Offer Notification */}
      {rematchOfferReceived && (
        <div className="p-4 rounded-2xl bg-blue-950/80 border-2 border-blue-500/60 shadow-xl flex items-center justify-between gap-4 animate-in slide-in-from-top">
          <div className="flex items-center gap-3">
            <Swords className="text-blue-400 shrink-0" size={24} />
            <div>
              <h4 className="text-sm font-bold text-white">Desafio de Revanche!</h4>
              <p className="text-xs text-blue-200/90">Seu adversário quer jogar outra partida com cores invertidas.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleAcceptRematch}
              className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors"
            >
              Aceitar Revanche
            </button>
            <button
              onClick={() => setRematchOfferReceived(false)}
              className="px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold text-xs transition-colors"
            >
              Recusar
            </button>
          </div>
        </div>
      )}

      {/* Game Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Board & Player Cards (7 cols on lg) */}
        <div className="lg:col-span-7 flex flex-col items-center space-y-3">
          {/* Opponent Card (Top) */}
          <div
            className={`w-full max-w-[560px] p-3 rounded-2xl border transition-all flex items-center justify-between ${
              turn === (playerRole === 'w' ? 'b' : 'w') && status === 'active'
                ? 'bg-amber-500/10 border-amber-500/50 shadow-md shadow-amber-500/10'
                : 'bg-[#171d29] border-gray-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center font-bold text-gray-200">
                  {opponent ? opponent.name.charAt(0).toUpperCase() : '?'}
                </div>
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#171d29] ${
                    opponentOnline ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
                  }`}
                  title={opponentOnline ? 'Oponente conectado' : 'Aguardando oponente'}
                />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">
                    {opponent ? opponent.name : 'Aguardando adversário...'}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-gray-800 border border-gray-700 text-gray-300 font-semibold">
                    {playerRole === 'w' ? 'Pretas' : 'Brancas'}
                  </span>
                </div>

                {/* Captured pieces by opponent */}
                <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                  <div className="flex items-center -space-x-1">
                    {(playerRole === 'w' ? captured.white : captured.black).map((p, idx) => (
                      <div key={idx} className="w-4 h-4">
                        <ChessPiece type={p} color={playerRole === 'w' ? 'w' : 'b'} />
                      </div>
                    ))}
                  </div>
                  {((playerRole === 'w' && blackAdvantage > 0) || (playerRole === 'b' && whiteAdvantage > 0)) && (
                    <span className="text-[10px] font-bold text-amber-400 ml-1">
                      +{playerRole === 'w' ? blackAdvantage : whiteAdvantage}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {turn === (playerRole === 'w' ? 'b' : 'w') && status === 'active' && (
              <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold border border-amber-500/30 animate-pulse">
                Vez de Jogar
              </span>
            )}
          </div>

          {/* Interactive Chess Board */}
          <ChessBoard
            fen={fen}
            playerColor={playerRole}
            orientation={orientation}
            interactive={isMyTurn}
            lastMove={lastMove}
            onMakeMove={handleMakeMove}
          />

          {/* My Player Card (Bottom) */}
          <div
            className={`w-full max-w-[560px] p-3 rounded-2xl border transition-all flex items-center justify-between ${
              isMyTurn
                ? 'bg-amber-500/10 border-amber-500/50 shadow-md shadow-amber-500/10'
                : 'bg-[#171d29] border-gray-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center font-bold">
                  {localPlayer.name.charAt(0).toUpperCase()}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#171d29]" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">
                    {localPlayer.name} <span className="text-xs text-gray-400 font-normal">(Você)</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-gray-800 border border-gray-700 text-gray-300 font-semibold">
                    {playerRole === 'w' ? 'Brancas' : playerRole === 'b' ? 'Pretas' : 'Espectador'}
                  </span>
                </div>

                {/* Captured pieces by me */}
                <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                  <div className="flex items-center -space-x-1">
                    {(playerRole === 'w' ? captured.black : captured.white).map((p, idx) => (
                      <div key={idx} className="w-4 h-4">
                        <ChessPiece type={p} color={playerRole === 'w' ? 'b' : 'w'} />
                      </div>
                    ))}
                  </div>
                  {((playerRole === 'w' && whiteAdvantage > 0) || (playerRole === 'b' && blackAdvantage > 0)) && (
                    <span className="text-[10px] font-bold text-amber-400 ml-1">
                      +{playerRole === 'w' ? whiteAdvantage : blackAdvantage}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {isMyTurn ? (
              <span className="px-3 py-1 rounded-full bg-amber-500 text-black text-xs font-black shadow-md animate-bounce">
                Sua Vez!
              </span>
            ) : status === 'waiting' ? (
              <span className="text-xs text-gray-400 font-medium">Aguardando oponente...</span>
            ) : status === 'active' ? (
              <span className="text-xs text-gray-400 font-medium">Vez do adversário</span>
            ) : null}
          </div>
        </div>

        {/* Right Column: Game Status, Controls & Tabs (5 cols on lg) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Status & Alerts Box */}
          <div className="p-4 rounded-2xl bg-[#171d29] border border-gray-800 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Status da Partida
              </span>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                  status === 'active'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : status === 'waiting'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-red-500/20 text-red-300 border border-red-500/30'
                }`}
              >
                {status === 'active'
                  ? 'Partida em Andamento'
                  : status === 'waiting'
                  ? 'Aguardando Entrada'
                  : 'Partida Finalizada'}
              </span>
            </div>

            {/* Turn & Outcome Banner */}
            {status === 'waiting' ? (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-2">
                <p className="font-semibold text-sm">Convide um amigo para começar!</p>
                <p className="text-gray-300">
                  Compartilhe o código <strong>{roomCode}</strong> ou copie o link direto. A partida iniciará automaticamente quando ele entrar.
                </p>
                <button
                  onClick={copyRoomLink}
                  className="w-full py-2 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                >
                  <Share2 size={14} />
                  <span>Copiar Link de Convite</span>
                </button>
              </div>
            ) : status === 'checkmate' || status === 'resigned' || status === 'draw' ? (
              <div className="p-4 rounded-xl bg-gradient-to-r from-[#202736] to-[#1a202c] border border-amber-500/40 text-center space-y-2">
                <Trophy className="mx-auto text-amber-400" size={32} />
                <h3 className="text-base font-black text-white">
                  {winner === 'draw'
                    ? 'Partida Empatada!'
                    : winner === (playerRole === 'w' ? 'white' : 'black')
                    ? 'Vitória! Você Venceu!'
                    : 'Fim de Jogo! Adversário Venceu!'}
                </h3>
                <p className="text-xs text-gray-300">{winReason}</p>

                {/* Rematch Button */}
                <div className="pt-2">
                  <button
                    onClick={handleOfferRematch}
                    disabled={rematchOfferSent}
                    className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs shadow-md flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <RotateCcw size={14} />
                    <span>{rematchOfferSent ? 'Proposta de Revanche Enviada...' : 'Pedir Revanche'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-gray-900 border border-gray-800 text-xs text-gray-300 flex items-center justify-between">
                <span>
                  Vez de jogar:{' '}
                  <strong className={turn === 'w' ? 'text-amber-300' : 'text-blue-300'}>
                    {turn === 'w' ? 'Brancas' : 'Pretas'}
                  </strong>
                </span>
                <span className="text-[11px] text-gray-400">
                  {isMyTurn ? 'Seu lance' : 'Aguardando lance'}
                </span>
              </div>
            )}

            {/* In-game action buttons (Draw / Resign) */}
            {status === 'active' && playerRole !== 'spectator' && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={handleOfferDraw}
                  disabled={drawOfferSent}
                  className="py-2 px-3 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-700 text-gray-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Handshake size={14} className="text-amber-400" />
                  <span>{drawOfferSent ? 'Empate Proposto' : 'Propor Empate'}</span>
                </button>
                <button
                  onClick={handleResign}
                  className="py-2 px-3 rounded-xl bg-red-950/40 hover:bg-red-900/40 border border-red-500/30 text-red-300 hover:text-red-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Flag size={14} />
                  <span>Abandonar</span>
                </button>
              </div>
            )}
          </div>

          {/* Tab Navigation: Moves / Chat / Info */}
          <div className="bg-[#171d29] border border-gray-800 rounded-2xl shadow-xl overflow-hidden flex flex-col h-[340px]">
            {/* Tabs Header */}
            <div className="flex items-center border-b border-gray-800 bg-[#141924]">
              <button
                onClick={() => setActiveTab('moves')}
                className={`flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
                  activeTab === 'moves'
                    ? 'border-amber-400 text-amber-300 bg-amber-500/5'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                <History size={14} />
                <span>Lances ({moveList.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 transition-colors relative ${
                  activeTab === 'chat'
                    ? 'border-amber-400 text-amber-300 bg-amber-500/5'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                <MessageSquare size={14} />
                <span>Chat</span>
                {chatMessages.length > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('info')}
                className={`flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
                  activeTab === 'info'
                    ? 'border-amber-400 text-amber-300 bg-amber-500/5'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                <Info size={14} />
                <span>Info / FEN</span>
              </button>
            </div>

            {/* TAB 1: Move History (SAN format) */}
            {activeTab === 'moves' && (
              <div
                ref={movesScrollRef}
                className="flex-1 p-3 overflow-y-auto space-y-1 text-xs font-mono select-text"
              >
                {moveList.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-500 text-xs italic">
                    Nenhum lance realizado ainda.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                    {Array.from({ length: Math.ceil(moveList.length / 2) }).map((_, idx) => {
                      const whiteMove = moveList[idx * 2];
                      const blackMove = moveList[idx * 2 + 1];
                      return (
                        <div
                          key={idx}
                          className="col-span-2 grid grid-cols-12 py-1 px-2 rounded-md hover:bg-gray-800/60 text-gray-300"
                        >
                          <span className="col-span-2 text-gray-500">{idx + 1}.</span>
                          <span className="col-span-5 font-semibold text-white">
                            {whiteMove?.san || ''}
                          </span>
                          <span className="col-span-5 font-semibold text-amber-200">
                            {blackMove?.san || ''}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Live Chat */}
            {activeTab === 'chat' && (
              <div className="flex-1 flex flex-col justify-between overflow-hidden">
                <div
                  ref={chatScrollRef}
                  className="flex-1 p-3 overflow-y-auto space-y-2 text-xs select-text"
                >
                  {chatMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500 text-xs space-y-1">
                      <MessageSquare size={20} className="text-gray-600" />
                      <span>Envie uma mensagem ou reação para seu adversário!</span>
                    </div>
                  ) : (
                    chatMessages.map((msg) => {
                      const isMe = msg.senderId === localPlayer.id;
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                        >
                          <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mb-0.5">
                            <span>{msg.senderName}</span>
                            <span>•</span>
                            <span>{msg.time}</span>
                          </div>
                          <div
                            className={`px-3 py-1.5 rounded-2xl max-w-[85%] break-words ${
                              isMe
                                ? 'bg-amber-600 text-white rounded-tr-xs'
                                : 'bg-gray-800 text-gray-200 rounded-tl-xs'
                            }`}
                          >
                            {msg.text}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Quick emoji reaction bar */}
                <div className="px-3 py-1.5 bg-gray-900 border-t border-gray-800 flex items-center justify-between gap-1">
                  {['👏', '🔥', '🤔', '👑', '⚔️', 'GG'].map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        setChatInput(emoji);
                      }}
                      className="px-2 py-0.5 rounded-md hover:bg-gray-800 text-sm transition-colors"
                      title={`Enviar ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                {/* Chat input form */}
                <form
                  onSubmit={handleSendChat}
                  className="p-2 bg-[#141924] border-t border-gray-800 flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Digite uma mensagem..."
                    className="flex-1 px-3 py-2 rounded-xl bg-gray-900 border border-gray-700 text-xs text-white placeholder-gray-500 focus:outline-hidden focus:border-amber-400"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim()}
                    className="p-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-40 transition-colors"
                  >
                    <Send size={14} />
                  </button>
                </form>
              </div>
            )}

            {/* TAB 3: Room Info & FEN */}
            {activeTab === 'info' && (
              <div className="flex-1 p-3.5 overflow-y-auto space-y-3 text-xs select-text">
                <div>
                  <span className="text-gray-400 uppercase font-semibold text-[10px] block mb-1">
                    Posição FEN Atual:
                  </span>
                  <div className="p-2 rounded-lg bg-gray-900 border border-gray-800 font-mono text-[11px] text-amber-300 break-all select-all">
                    {fen}
                  </div>
                </div>

                <div>
                  <span className="text-gray-400 uppercase font-semibold text-[10px] block mb-1">
                    Detalhes da Conexão:
                  </span>
                  <div className="space-y-1 text-gray-300 text-[11px]">
                    <div className="flex justify-between py-1 border-b border-gray-800">
                      <span className="text-gray-400">Canal Realtime:</span>
                      <span className="font-mono text-emerald-400">Ativo</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-800">
                      <span className="text-gray-400">Transmissão de Lances:</span>
                      <span className="text-white">Instantânea (Broadcast + DB)</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-gray-400">Setup Supabase SQL:</span>
                      <button
                        onClick={onOpenSqlModal}
                        className="text-amber-400 hover:underline font-semibold"
                      >
                        Ver Script
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
