import React, { useState } from 'react';
import { SUPABASE_SQL_SCRIPT, SUPABASE_INSTRUCTIONS } from '../lib/sqlScript';
import { Copy, Check, ExternalLink, Database, X, AlertCircle } from 'lucide-react';

interface SqlModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRetest: () => void;
  connectionStatus: {
    connected: boolean;
    tablesExist: boolean;
    error?: string;
  };
}

export const SqlModal: React.FC<SqlModalProps> = ({
  isOpen,
  onClose,
  onRetest,
  connectionStatus,
}) => {
  const [copied, setCopied] = useState(false);
  const [testing, setTesting] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(SUPABASE_SQL_SCRIPT);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Ignore
    }
  };

  const handleTest = async () => {
    setTesting(true);
    await onRetest();
    setTesting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-[#141822] border border-amber-500/30 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#1a202c] border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Database size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Configuração do Supabase (SQL &amp; Realtime)
              </h2>
              <p className="text-xs text-gray-400">
                Script para criação das tabelas e habilitação do Supabase Realtime
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {/* Status Alert */}
          <div
            className={`p-3.5 rounded-xl border flex items-start gap-3 ${
              connectionStatus.tablesExist
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
            }`}
          >
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <div className="text-xs">
              <div className="font-semibold text-sm mb-0.5">
                {connectionStatus.tablesExist
                  ? 'Status: Tabelas e Realtime Detectados no Banco!'
                  : 'Aviso: Tabelas precisam ser criadas no Supabase'}
              </div>
              <p className="text-gray-300">
                {connectionStatus.tablesExist
                  ? 'As tabelas "rooms" e "moves" já estão ativas e sincronizando em tempo real.'
                  : 'Para salvar o histórico e habilitar a persistência total do jogo em nuvem, copie o script abaixo e execute no SQL Editor do Supabase.'}
              </p>
            </div>
          </div>

          {/* Quick Steps */}
          <div>
            <h3 className="font-semibold text-white mb-2 text-xs uppercase tracking-wider text-amber-400">
              Passo a Passo Rápido:
            </h3>
            <ol className="space-y-1.5 text-xs text-gray-300 list-decimal list-inside pl-1">
              {SUPABASE_INSTRUCTIONS.map((step, idx) => (
                <li key={idx} className="leading-relaxed">
                  {step}
                </li>
              ))}
            </ol>
          </div>

          {/* Direct Link to SQL Editor */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-gray-900 border border-gray-800">
            <span className="text-xs text-gray-400">Link direto para seu projeto Supabase:</span>
            <a
              href="https://supabase.com/dashboard/project/jsjuozqdtqkzgczhrrhv/sql/new"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-300 bg-amber-500/15 border border-amber-500/30 rounded-lg hover:bg-amber-500/25 transition-colors"
            >
              Abrir SQL Editor no Supabase <ExternalLink size={14} />
            </a>
          </div>

          {/* Code box */}
          <div className="relative">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-gray-400">Script SQL DDL:</span>
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-md transition-all shadow-sm"
              >
                {copied ? (
                  <>
                    <Check size={14} className="text-emerald-300" />
                    <span>Copiado com Sucesso!</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    <span>Copiar Script SQL</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-4 rounded-xl bg-[#0b0e14] border border-gray-800 text-[11px] font-mono text-gray-300 overflow-x-auto max-h-56 leading-relaxed select-all">
              {SUPABASE_SQL_SCRIPT}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#1a202c] border-t border-gray-800">
          <button
            onClick={handleTest}
            disabled={testing}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 transition-colors disabled:opacity-50"
          >
            {testing ? 'Testando Conexão...' : 'Testar Conexão Novamente'}
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-500 text-white shadow-md transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
