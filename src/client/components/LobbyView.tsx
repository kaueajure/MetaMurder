import React from 'react';
import { RoomSummary, GameSettings } from '../../shared/types';
import { soundEngine } from '../audio/soundEffects';
import { CharacterPreview } from './CharacterPreview';
import stationDeck from '../assets/station-command-deck.webp';

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
  const copyCode = async () => {
    soundEngine.playButtonClick();
    await navigator.clipboard.writeText(summary.code);
  };

  return (
    <main className="relative min-h-screen overflow-y-auto bg-[#02050b] text-white">
      <div
        className="fixed inset-0 bg-cover bg-center opacity-35 scale-105 blur-[2px]"
        style={{ backgroundImage: `url(${stationDeck})` }}
      />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(6,35,55,.38),rgba(2,5,11,.94)_72%)]" />

      <div className="relative z-10 min-h-screen px-4 md:px-8 py-5 flex flex-col">
        <header className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <p className="text-[9px] uppercase tracking-[.38em] text-cyan-200/60 font-bold">Sala de preparação</p>
            <div className="flex items-center gap-3 mt-1">
              <h1 className="text-xl md:text-2xl font-black">{summary.name}</h1>
              <span className="flex items-center gap-1.5 text-[9px] text-emerald-300 uppercase tracking-wider">
                <i className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                Conectado
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => void copyCode()}
              className="h-11 px-4 border border-cyan-200/20 bg-cyan-300/5 hover:bg-cyan-300/10 transition-colors"
            >
              <span className="text-[8px] uppercase tracking-wider text-slate-500 mr-3">Código</span>
              <strong className="font-mono tracking-[.25em] text-cyan-200">{summary.code}</strong>
            </button>
            <button
              onClick={() => { soundEngine.playButtonClick(); onOpenCustomize(); }}
              className="h-11 px-4 border border-amber-200/30 bg-amber-300/10 hover:bg-amber-300/20 text-xs font-black text-amber-100 transition-colors"
            >
              PERSONALIZAR TRAJE
            </button>
            <button
              onClick={() => { soundEngine.playButtonClick(); onLeaveRoom(); }}
              className="h-11 px-4 border border-white/10 bg-black/30 hover:bg-rose-400/10 hover:border-rose-300/30 text-xs font-bold text-slate-400 hover:text-rose-200"
            >
              SAIR
            </button>
          </div>
        </header>

        <div className="flex-1 w-full max-w-7xl mx-auto grid lg:grid-cols-[1fr_310px] gap-5 py-5">
          <section className="relative min-h-[560px] border border-white/10 bg-black/25 backdrop-blur-md overflow-hidden">
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_100%,rgba(34,211,238,.12),transparent_48%)]" />
            <div className="relative flex items-center justify-between px-5 py-3 border-b border-white/10">
              <div>
                <p className="text-[9px] uppercase tracking-[.28em] text-cyan-200/60 font-bold">Tripulação embarcada</p>
                <h2 className="font-black">{summary.playerCount} / {summary.maxPlayers} jogadores</h2>
              </div>
              {isHost && (
                <div className="flex gap-2">
                  <button
                    onClick={() => { soundEngine.playButtonClick(); onAddBot(); }}
                    className="px-3 py-2 border border-cyan-200/20 bg-cyan-300/5 text-[10px] font-bold text-cyan-100 hover:bg-cyan-300/15"
                  >
                    + BOT
                  </button>
                  <button
                    onClick={() => { soundEngine.playButtonClick(); onRemoveBot(); }}
                    className="px-3 py-2 border border-white/10 bg-white/[.03] text-[10px] font-bold text-slate-400 hover:text-white"
                  >
                    − BOT
                  </button>
                </div>
              )}
            </div>

            <div className="relative grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 bg-[#040a12]">
              {summary.players.map(player => (
                <div key={player.id} className="relative h-52 bg-[#06101c]/95 overflow-hidden group border-r border-b border-white/10">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_70%,rgba(34,211,238,.1),transparent_45%)] opacity-60 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute inset-2 bottom-9">
                    <CharacterPreview
                      customization={{ color: player.color, hatId: player.hatId, skinId: player.skinId }}
                    />
                  </div>
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-3 py-2 border-t border-white/8 bg-black/45">
                    <span>
                      <strong className="block text-[11px] truncate max-w-28">{player.name}</strong>
                      <small className={`text-[8px] uppercase tracking-wider ${player.isReady ? 'text-emerald-300' : 'text-amber-300'}`}>
                        {player.isBot ? 'IA Gemini' : player.isReady ? 'Pronto' : 'Preparando'}
                      </small>
                    </span>
                    {player.isHost && <span className="text-amber-300 text-xs">◆</span>}
                  </div>
                </div>
              ))}
              {Array.from({ length: Math.max(0, summary.maxPlayers - summary.playerCount) }).map((_, index) => (
                <div key={`empty-${index}`} className="h-52 bg-[#040a12]/90 flex flex-col items-center justify-center text-white/10 border-r border-b border-white/10">
                  <span className="text-3xl font-thin">＋</span>
                  <small className="text-[8px] uppercase tracking-[.2em]">Vaga aberta</small>
                </div>
              ))}
            </div>
          </section>

          <aside className="space-y-4">
            <section className="border-y border-white/10 bg-black/40 backdrop-blur-lg">
              <div className="p-5 border-b border-white/10">
                <p className="text-[9px] uppercase tracking-[.3em] text-cyan-200/60 font-bold">Parâmetros da missão</p>
                <h2 className="text-lg font-black mt-1">Configuração</h2>
              </div>
              <div className="p-5 space-y-5">
                <label className="block">
                  <span className="block text-[9px] uppercase tracking-wider text-slate-500 font-bold mb-2">Assassinos</span>
                  <select
                    disabled={!isHost}
                    value={summary.impostorCount}
                    onChange={event => onUpdateSettings({ impostorCount: Number(event.target.value) })}
                    className="w-full h-11 px-3 bg-[#050b14] border border-white/10 text-sm outline-none focus:border-cyan-200/40"
                  >
                    <option value={1}>1 assassino</option>
                    <option value={2}>2 assassinos</option>
                    <option value={3}>3 assassinos</option>
                  </select>
                </label>

                <label className="block">
                  <span className="block text-[9px] uppercase tracking-wider text-slate-500 font-bold mb-2">Acesso</span>
                  <select
                    disabled={!isHost}
                    value={summary.isPrivate ? 'private' : 'public'}
                    onChange={event => onUpdateSettings({ isPrivate: event.target.value === 'private' })}
                    className="w-full h-11 px-3 bg-[#050b14] border border-white/10 text-sm outline-none focus:border-cyan-200/40"
                  >
                    <option value="public">Sala pública</option>
                    <option value="private">Somente por código</option>
                  </select>
                </label>
              </div>
            </section>

            {isHost ? (
              <button
                onClick={() => { soundEngine.playButtonClick(); onStartGame(); }}
                className="relative w-full min-h-24 overflow-hidden bg-emerald-300 text-[#03110c] font-black text-left px-5 hover:bg-emerald-200 transition-colors group"
              >
                <span className="block text-[9px] uppercase tracking-[.25em] opacity-60">Todos a bordo</span>
                <span className="block text-xl mt-1">INICIAR PARTIDA →</span>
                <span className="absolute -right-2 -bottom-7 text-8xl opacity-10 group-hover:translate-x-1 transition-transform">▶</span>
              </button>
            ) : (
              <div className="p-5 border-l-2 border-amber-300 bg-amber-300/5 text-xs text-amber-100">
                Aguardando o líder iniciar a missão…
              </div>
            )}

            <p className="text-[9px] leading-relaxed text-slate-600">
              A aparência equipada nesta sala será usada pelo mesmo renderizador durante toda a partida.
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
};
