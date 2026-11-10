import React, { useState, useEffect, useCallback } from 'react';
import {
  checkSupabaseStatus,
  getLocalPlayer,
  joinRoom,
} from './lib/supabase';
import { Lobby } from './components/Lobby';
import { GameRoom } from './components/GameRoom';
import { SqlModal } from './components/SqlModal';
import { SettingsModal } from './components/SettingsModal';
import { soundSystem } from './lib/audio';
import {
  Crown,
  Database,
  Settings,
  Volume2,
  VolumeX,
  User,
  Activity,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export default function App() {
  const [view, setView] = useState<'lobby' | 'game'>('lobby');
  const [currentRoomCode, setCurrentRoomCode] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState<'w' | 'b' | 'spectator'>('w');

  // Player state
  const [player, setPlayer] = useState(getLocalPlayer());

  // Modals
  const [sqlModalOpen, setSqlModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(soundSystem.isEnabled());

  // Connection status
  const [supabaseStatus, setSupabaseStatus] = useState<{
    connected: boolean;
    tablesExist: boolean;
    error?: string;
  }>({
    connected: true,
    tablesExist: true,
  });

  const refreshStatus = useCallback(async () => {
    const status = await checkSupabaseStatus();
    setSupabaseStatus(status);
  }, []);

  // Check URL query parameters for invite link: ?room=XYZ123
  useEffect(() => {
    refreshStatus();

    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const roomParam = urlParams.get('room');
      if (roomParam) {
        joinRoom(roomParam).then((res) => {
          if (res.room) {
            setCurrentRoomCode(res.room.code);
            setCurrentRole(res.role);
            setView('game');
          }
        });
      }
    }
  }, [refreshStatus]);

  const handleEnterRoom = (code: string, role: 'w' | 'b' | 'spectator') => {
    setCurrentRoomCode(code);
    setCurrentRole(role);
    setView('game');

    // Update URL query parameter without full reload
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('room', code);
      window.history.pushState({}, '', url.toString());
    }
  };

  const handleLeaveRoom = () => {
    setView('lobby');
    setCurrentRoomCode(null);

    // Clean URL
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('room');
      window.history.pushState({}, '', url.toString());
    }
  };

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundSystem.setEnabled(next);
    if (next) soundSystem.playMove();
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0d1117] text-[#f0ece1] selection:bg-amber-500/30 selection:text-amber-200">
      {/* Top Application Header */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-[#111622]/90 border-b border-gray-800/80 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          {/* Logo */}
          <div
            onClick={handleLeaveRoom}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="p-2 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 text-black shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
              <Crown size={22} className="stroke-[2.5]" />
            </div>
            <div>
              <span className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                CHESS <span className="text-amber-400">REALTIME</span>
              </span>
              <span className="text-[10px] text-gray-400 tracking-wider uppercase font-semibold block -mt-1 hidden sm:block">
                Multiplayer Supabase
              </span>
            </div>
          </div>

          {/* Right Header Navigation & Badges */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Supabase Status Pill */}
            <button
              onClick={() => setSqlModalOpen(true)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                supabaseStatus.tablesExist
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400 hover:bg-emerald-950/60'
                  : 'bg-amber-950/40 border-amber-500/50 text-amber-400 hover:bg-amber-950/60 animate-pulse'
              }`}
              title="Clique para ver o status da conexão e script SQL"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  supabaseStatus.tablesExist ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              <span className="hidden sm:inline">
                {supabaseStatus.tablesExist ? 'Supabase Online' : 'Configurar SQL'}
              </span>
              <Database size={13} className="opacity-80" />
            </button>

            {/* Sound Toggle */}
            <button
              onClick={handleToggleSound}
              className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
              title={soundEnabled ? 'Mudo' : 'Ativar Sons'}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>

            {/* Player Profile Pill */}
            <button
              onClick={() => setSettingsModalOpen(true)}
              className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 transition-colors"
              title="Configurar seu perfil e nome"
            >
              <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 font-bold text-xs flex items-center justify-center">
                {player.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-semibold hidden md:inline truncate max-w-[120px]">
                {player.name}
              </span>
              <Settings size={14} className="text-gray-400" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col justify-center">
        {view === 'lobby' ? (
          <Lobby
            onEnterRoom={handleEnterRoom}
            onOpenSqlModal={() => setSqlModalOpen(true)}
            onOpenSettings={() => setSettingsModalOpen(true)}
            supabaseStatus={supabaseStatus}
          />
        ) : (
          <GameRoom
            roomCode={currentRoomCode!}
            initialRole={currentRole}
            onLeave={handleLeaveRoom}
            onOpenSqlModal={() => setSqlModalOpen(true)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="w-full py-4 px-4 text-center text-xs text-gray-500 border-t border-gray-850 bg-[#0d1117]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Xadrez Multiplayer Online • Supabase Realtime &amp; chess.js</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSqlModalOpen(true)}
              className="hover:text-amber-400 transition-colors"
            >
              Script SQL Supabase
            </button>
            <span>•</span>
            <button
              onClick={() => setSettingsModalOpen(true)}
              className="hover:text-amber-400 transition-colors"
            >
              Configurações
            </button>
          </div>
        </div>
      </footer>

      {/* SQL Setup Modal */}
      <SqlModal
        isOpen={sqlModalOpen}
        onClose={() => setSqlModalOpen(false)}
        onRetest={refreshStatus}
        connectionStatus={supabaseStatus}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        onPlayerUpdated={() => setPlayer(getLocalPlayer())}
      />
    </div>
  );
}
