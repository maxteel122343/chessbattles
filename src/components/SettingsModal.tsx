import React, { useState } from 'react';
import { soundSystem } from '../lib/audio';
import {
  getLocalPlayer,
  setLocalPlayerName,
  getSupabaseCredentials,
  saveSupabaseCredentials,
  DEFAULT_SUPABASE_URL,
  DEFAULT_SUPABASE_ANON_KEY,
} from '../lib/supabase';
import { User, Volume2, VolumeX, Key, X, Check, RotateCcw } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlayerUpdated: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onPlayerUpdated }) => {
  const current = getLocalPlayer();
  const credentials = getSupabaseCredentials();

  const [name, setName] = useState(current.name);
  const [soundEnabled, setSoundEnabled] = useState(soundSystem.isEnabled());
  const [supabaseUrl, setSupabaseUrl] = useState(credentials.url);
  const [anonKey, setAnonKey] = useState(credentials.anonKey);
  const [savedNotice, setSavedNotice] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    setLocalPlayerName(name);
    soundSystem.setEnabled(soundEnabled);
    saveSupabaseCredentials(supabaseUrl, anonKey);
    onPlayerUpdated();
    setSavedNotice(true);
    setTimeout(() => {
      setSavedNotice(false);
      onClose();
    }, 800);
  };

  const handleResetCredentials = () => {
    setSupabaseUrl(DEFAULT_SUPABASE_URL);
    setAnonKey(DEFAULT_SUPABASE_ANON_KEY);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg bg-[#141822] border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#1a202c] border-b border-gray-800">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            Configurações &amp; Perfil
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 text-sm">
          {/* Player Name */}
          <div>
            <label className="flex items-center gap-2 text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
              <User size={14} className="text-amber-400" />
              Seu Nome de Jogador
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={24}
              placeholder="Digite seu apelido"
              className="w-full px-4 py-2.5 rounded-xl bg-gray-900 border border-gray-700 text-white placeholder-gray-500 focus:outline-hidden focus:border-amber-500 transition-colors"
            />
            <span className="text-[11px] text-gray-400 mt-1 block">
              Este nome será exibido para seus adversários nas partidas.
            </span>
          </div>

          {/* Sound Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-gray-900 border border-gray-800">
            <div className="flex items-center gap-3">
              {soundEnabled ? (
                <Volume2 className="text-amber-400" size={20} />
              ) : (
                <VolumeX className="text-gray-500" size={20} />
              )}
              <div>
                <span className="text-xs font-semibold text-white block">Efeitos Sonoros</span>
                <span className="text-[11px] text-gray-400">Sons de peças, captura e xeque</span>
              </div>
            </div>
            <button
              onClick={() => {
                const next = !soundEnabled;
                setSoundEnabled(next);
                soundSystem.setEnabled(next);
                if (next) soundSystem.playMove();
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                soundEnabled ? 'bg-amber-600' : 'bg-gray-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  soundEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Supabase API Config */}
          <div className="pt-2 border-t border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-300 uppercase tracking-wider">
                <Key size={14} className="text-amber-400" />
                Credenciais Supabase
              </label>
              <button
                onClick={handleResetCredentials}
                className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1"
                title="Restaurar chaves originais"
              >
                <RotateCcw size={12} /> Restaurar Padrão
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-gray-400 text-[11px] block mb-1">Supabase Project URL:</span>
                <input
                  type="text"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-gray-200 font-mono text-xs focus:outline-hidden focus:border-amber-500"
                />
              </div>
              <div>
                <span className="text-gray-400 text-[11px] block mb-1">Supabase Anon Key:</span>
                <input
                  type="password"
                  value={anonKey}
                  onChange={(e) => setAnonKey(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-gray-200 font-mono text-xs focus:outline-hidden focus:border-amber-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#1a202c] border-t border-gray-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-500 text-white shadow-md transition-colors"
          >
            {savedNotice ? (
              <>
                <Check size={14} className="text-white" />
                Salvo!
              </>
            ) : (
              'Salvar Alterações'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
