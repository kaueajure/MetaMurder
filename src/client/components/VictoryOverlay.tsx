import React, { useEffect } from 'react';
import { soundEngine } from '../audio/soundEffects';

interface Props {
  winner: 'CREWMATES' | 'IMPOSTORS';
  reason: string;
  impostorIds: string[];
  selfRole: 'CREWMATE' | 'IMPOSTOR';
  onReturnToLobby: () => void;
}

export const VictoryOverlay: React.FC<Props> = ({ winner, reason, impostorIds, selfRole, onReturnToLobby }) => {
  const isVictory = (winner === 'CREWMATES' && selfRole === 'CREWMATE') || (winner === 'IMPOSTORS' && selfRole === 'IMPOSTOR');

  useEffect(() => {
    if (isVictory) {
      soundEngine.playVictoryTune();
    } else {
      soundEngine.playKillSound();
    }
  }, [isVictory]);

  return (
    <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl z-50 flex flex-col items-center justify-center p-6 text-center">
      <div className={`w-32 h-32 rounded-full flex items-center justify-center text-6xl mb-6 shadow-2xl animate-bounce border-4 ${isVictory ? 'bg-emerald-950 border-emerald-500 shadow-emerald-500/50' : 'bg-rose-950 border-rose-500 shadow-rose-500/50'}`}>
        {isVictory ? '🏆' : '💀'}
      </div>

      <h1 className={`text-5xl md:text-7xl font-black mb-3 tracking-wider ${isVictory ? 'text-emerald-400' : 'text-rose-500'}`}>
        {isVictory ? 'VITÓRIA' : 'DERROTA'}
      </h1>

      <p className="text-xl font-bold text-slate-300 mb-2">{winner === 'CREWMATES' ? 'OS TRIPULANTES VENCERAM!' : 'OS ASSASSINOS VENCERAM!'}</p>
      <p className="text-sm font-mono text-slate-400 max-w-md mb-8">{reason}</p>

      <button
        onClick={() => { soundEngine.playButtonClick(); onReturnToLobby(); }}
        className="px-8 py-4 bg-cyan-600 hover:bg-cyan-500 font-black text-white text-lg rounded-2xl shadow-xl transition-all active:scale-95 border border-cyan-400/50"
      >
        VOLTAR AO LOBBY
      </button>
    </div>
  );
};
