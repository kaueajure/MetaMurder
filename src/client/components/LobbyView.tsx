import React from 'react';
import { RoomSummary, GameSettings, PlayerCustomization } from '../../shared/types';
import { PLAYER_COLORS } from '../../shared/constants';
import { soundEngine } from '../audio/soundEffects';

interface Props {
  summary: RoomSummary;
  isHost: boolean;
  onStartGame: () => void;
  onLeaveRoom: () => void;
  onAddBot: () => void;
  onRemoveBot: () => void;
  onUpdateSettings: (settings: Partial<GameSettings>) => void;
  onOpenCustomize: () => void;
}

export const LobbyView: React.FC<Props> = ({
  summary,
  isHost,
  onStartGame,
  onLeaveRoom,
  onAddBot,
  onRemoveBot,
  onUpdateSettings,
  onOpenCustomize
}) => {
  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 flex flex-col justify-between">
      {/* Header Bar */}
      <div className="flex justify-between items-center bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-md">
        <div>
          <h2 className="text-2xl font-black text-cyan-400 tracking-wide">{summary.name}</h2>
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
            <span>CÓDIGO DA SALA:</span>
            <span className="bg-slate-950 border border-cyan-500/40 text-cyan-400 font-mono font-bold px-3 py-1 rounded-lg text-sm tracking-widest select-all">
              {summary.code}
            </span>
            <button
              onClick={() => {
                soundEngine.playButtonClick();
                navigator.clipboard.writeText(summary.code);
                alert('Código da sala copiado para a área de transferência!');
              }}
              className="px-2.5 py-1 bg-cyan-950 hover:bg-cyan-900 border border-cyan-700/50 text-cyan-300 font-bold text-[10px] rounded-md transition-colors"
            >
              📋 COPIAR
            </button>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => { soundEngine.playButtonClick(); onOpenCustomize(); }}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700"
          >
            🎨 PERSONALIZAR
          </button>

          <button
            onClick={() => { soundEngine.playButtonClick(); onLeaveRoom(); }}
            className="px-4 py-2.5 bg-rose-950/80 hover:bg-rose-900 text-rose-400 font-bold text-xs rounded-xl border border-rose-800"
          >
            SAIR DA SALA
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 my-6 flex-1">
        {/* Connected Players Grid */}
        <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white">
                JOGADORES NA SALA ({summary.playerCount}/{summary.maxPlayers})
              </h3>

              {isHost && (
                <div className="flex gap-2">
                  <button
                    onClick={() => { soundEngine.playButtonClick(); onAddBot(); }}
                    className="px-3 py-1.5 bg-cyan-600/80 hover:bg-cyan-500 text-white font-bold text-xs rounded-lg"
                  >
                    + ADICIONAR BOT
                  </button>
                  <button
                    onClick={() => { soundEngine.playButtonClick(); onRemoveBot(); }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-lg border border-slate-700"
                  >
                    - REMOVER BOT
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {Array.from({ length: summary.playerCount }).map((_, idx) => (
                <div key={idx} className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-cyan-500 border-2 border-white/20 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-white truncate">Jogador #{idx + 1}</div>
                    <div className="text-[10px] text-emerald-400 font-mono">PRONTO</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Host Start Game Action */}
          {isHost ? (
            <button
              onClick={() => { soundEngine.playButtonClick(); onStartGame(); }}
              className="w-full py-4 mt-6 bg-emerald-600 hover:bg-emerald-500 font-black text-white text-lg rounded-2xl shadow-xl transition-all active:scale-98 border border-emerald-400/50"
            >
              INICIAR PARTIDA 🚀
            </button>
          ) : (
            <div className="text-center py-4 text-xs font-mono text-slate-400 animate-pulse">
              Aguardando o líder da sala iniciar a partida...
            </div>
          )}
        </div>

        {/* Room Settings Panel */}
        <div className="lg:col-span-1 bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">CONFIGURAÇÕES DA REUNIÃO</h3>

          <div className="space-y-4 text-xs font-sans">
            <div>
              <label className="text-slate-400 font-bold block mb-1">NÚMERO DE ASSASSINOS</label>
              <select
                disabled={!isHost}
                value={summary.impostorCount}
                onChange={e => onUpdateSettings({ impostorCount: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
              >
                <option value={1}>1 Assassino</option>
                <option value={2}>2 Assassinos</option>
                <option value={3}>3 Assassinos</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 font-bold block mb-1">VISIBILIDADE DA SALA</label>
              <select
                disabled={!isHost}
                value={summary.isPrivate ? 'private' : 'public'}
                onChange={e => onUpdateSettings({ isPrivate: e.target.value === 'private' })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
              >
                <option value="public">Pública (Aberta a todos)</option>
                <option value="private">Privada (Apenas com código)</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
