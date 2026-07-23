import React, { useState } from 'react';
import { MeetingState, PlayerPublicData, PlayerPrivateData, ChatMessage } from '../../shared/types';
import { PLAYER_COLORS } from '../../shared/constants';
import { ChatBox } from './ChatBox';
import { soundEngine } from '../audio/soundEffects';

interface Props {
  meeting: MeetingState;
  players: PlayerPublicData[];
  self: PlayerPrivateData;
  chatMessages: ChatMessage[];
  onCastVote: (targetId: string) => void;
  onSendMessage: (text: string) => void;
}

export const MeetingOverlay: React.FC<Props> = ({ meeting, players, self, chatMessages, onCastVote, onSendMessage }) => {
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);

  const isSelfDead = self.state === 'DEAD' || self.state === 'GHOST';
  const hasVoted = meeting.hasVoted[self.id];
  const voteTargetName = (targetId: string | undefined) => {
    if (!targetId) return '';
    if (targetId === 'SKIP') return 'PULAR';
    return players.find(player => player.id === targetId)?.name ?? 'DESCONHECIDO';
  };

  const handleVoteConfirm = () => {
    if (selectedTarget && !hasVoted && !isSelfDead) {
      soundEngine.playButtonClick();
      onCastVote(selectedTarget);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-lg z-50 flex flex-col p-4 md:p-8">
      {/* Top Bar */}
      <div className="flex justify-between items-center mb-6 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl">
        <div>
          <h2 className="text-2xl font-black text-rose-500 tracking-wider flex items-center gap-2">
            🚨 CORPO RELATADO
          </h2>
          <p className="text-xs text-slate-400">
            Relatado por: <span className="text-amber-400 font-bold">{meeting.callerName}</span>
          </p>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-[10px] text-slate-500 font-mono">FASE ATUAL</div>
            <div className="text-sm font-bold text-cyan-400">{meeting.phase === 'DISCUSSION' ? 'DISCUSSÃO' : meeting.phase === 'VOTING' ? 'VOTAÇÃO' : 'RESULTADO'}</div>
          </div>
          <div className="bg-slate-950 border-2 border-cyan-500/40 rounded-xl px-4 py-2 text-center min-w-[80px]">
            <div className="text-[10px] text-slate-500 font-mono">TEMPO</div>
            <div className="text-2xl font-black text-white font-mono">{Math.ceil(meeting.timer)}s</div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      {meeting.phase !== 'RESULT' ? (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
          {/* Player Grid (2 Columns) */}
          <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between overflow-y-auto">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {players.map(p => {
                const colorObj = PLAYER_COLORS.find(c => c.id === p.color) || PLAYER_COLORS[0];
                const isDead = p.state === 'DEAD' || p.state === 'GHOST';
                const pVoted = meeting.hasVoted[p.id];
                const votedFor = voteTargetName(meeting.votes[p.id]);
                const isSelected = selectedTarget === p.id;

                return (
                  <button
                    key={p.id}
                    disabled={isDead || hasVoted || isSelfDead || meeting.phase !== 'VOTING'}
                    onClick={() => setSelectedTarget(p.id)}
                    className={`relative p-3 rounded-xl border-2 flex items-center gap-3 transition-all text-left ${isSelected ? 'border-amber-400 bg-amber-500/10 scale-102' : 'border-slate-800 bg-slate-900 hover:border-slate-700'} ${isDead ? 'opacity-40 grayscale' : ''}`}
                  >
                    <div className="w-8 h-8 rounded-full border-2 border-white/20 flex-shrink-0" style={{ backgroundColor: colorObj.hex }} />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white truncate">{p.name}</div>
                      {isDead && <span className="text-[9px] text-rose-400 font-bold">MORTO</span>}
                      {p.isBot && <span className="ml-1 text-[8px] text-cyan-400 font-mono">BOT</span>}
                      {pVoted && (
                        <div className="mt-1 text-[9px] font-bold text-amber-300 truncate">
                          VOTOU EM: {votedFor}
                        </div>
                      )}
                    </div>

                    {/* Voted check badge */}
                    {pVoted && (
                      <span className="w-5 h-5 rounded-full bg-emerald-500 text-black text-xs font-bold flex items-center justify-center">✓</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Voting Controls */}
            {meeting.phase === 'VOTING' && !hasVoted && !isSelfDead && (
              <div className="mt-6 pt-4 border-t border-slate-800 flex justify-between items-center gap-4">
                <button
                  onClick={() => setSelectedTarget('SKIP')}
                  className={`px-4 py-3 rounded-xl border-2 font-bold text-xs transition-all ${selectedTarget === 'SKIP' ? 'border-amber-400 bg-amber-500/20 text-amber-300' : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'}`}
                >
                  PULAR VOTAÇÃO
                </button>

                <button
                  disabled={!selectedTarget}
                  onClick={handleVoteConfirm}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
                >
                  CONFIRMAR VOTO
                </button>
              </div>
            )}
          </div>

          {/* Embedded Meeting Chat */}
          <div className="lg:col-span-1 h-full min-h-[300px]">
            <ChatBox messages={chatMessages} self={self} onSendMessage={onSendMessage} />
          </div>
        </div>
      ) : (
        /* Result & Ejection Screen */
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-900/40 border border-slate-800 rounded-2xl overflow-y-auto">
          {meeting.ejectedPlayerName ? (
            <div>
              <div className="w-24 h-24 rounded-full bg-rose-950 border-4 border-rose-500 flex items-center justify-center text-4xl mx-auto mb-6 animate-bounce">
                🚀
              </div>
              <h3 className="text-3xl font-black text-white mb-2">{meeting.ejectedPlayerName} FOI EXPULSO.</h3>
              <p className="text-xl font-bold font-mono text-cyan-400">
                {meeting.wasImpostor ? 'Ele era um dos Assassinos.' : 'Ele NÃO era um dos Assassinos.'}
              </p>
            </div>
          ) : (
            <div>
              <div className="text-5xl mb-4">🤝</div>
              <h3 className="text-3xl font-black text-slate-300 mb-2">Ninguém foi expulso (empate ou votos pulados).</h3>
            </div>
          )}

          <div className="mt-8 w-full max-w-3xl border-t border-slate-700 pt-5">
            <h4 className="text-xs font-black tracking-[.25em] text-cyan-300 mb-3">REGISTRO INDIVIDUAL DOS VOTOS</h4>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 text-left">
              {players
                .filter(player => meeting.votes[player.id])
                .map(player => (
                  <div key={player.id} className="flex items-center justify-between gap-3 bg-slate-950/75 border border-slate-800 px-3 py-2">
                    <span className="min-w-0 text-xs font-bold text-white truncate">
                      {player.name}
                      {player.isBot && <small className="ml-1 text-cyan-400">BOT</small>}
                    </span>
                    <span className="text-[10px] font-black text-amber-300 truncate">
                      → {voteTargetName(meeting.votes[player.id])}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
