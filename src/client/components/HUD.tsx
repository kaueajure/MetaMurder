import React from 'react';
import { PlayerPrivateData, SabotageState } from '../../shared/types';
import { soundEngine } from '../audio/soundEffects';

interface Props {
  self: PlayerPrivateData;
  completedTasks: number;
  totalTasks: number;
  sabotage: SabotageState;
  nearbyInteractable: string | null;
  onUseInteract: () => void;
  onKill: () => void;
  onReport: () => void;
  onSabotage: () => void;
  onVent: () => void;
  onToggleMinimap: () => void;
}

export const HUD: React.FC<Props> = ({
  self,
  completedTasks,
  totalTasks,
  sabotage,
  nearbyInteractable,
  onUseInteract,
  onKill,
  onReport,
  onSabotage,
  onVent,
  onToggleMinimap
}) => {
  const isImpostor = self.role === 'IMPOSTOR';
  const isAlive = self.state === 'ALIVE';
  const taskPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="fixed inset-0 pointer-events-none z-30 flex flex-col justify-between p-4">
      {/* Top Bar */}
      <div className="flex justify-between items-start">
        {/* Task Progress Bar */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 shadow-xl backdrop-blur-md min-w-[240px] pointer-events-auto">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-bold text-slate-400 font-mono">PROGRESSO DAS TAREFAS</span>
            <span className="text-xs font-mono font-bold text-emerald-400">{completedTasks}/{totalTasks}</span>
          </div>
          <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden p-0.5 border border-slate-800">
            <div 
              className="bg-emerald-500 h-full rounded-full transition-all duration-300 shadow-sm"
              style={{ width: `${taskPercent}%` }}
            />
          </div>
        </div>

        {/* Role Badge & Minimap Button */}
        <div className="flex gap-3 pointer-events-auto">
          <button
            onClick={onToggleMinimap}
            className="w-12 h-12 rounded-2xl bg-slate-900/90 border border-slate-800 text-cyan-400 hover:text-white flex items-center justify-center font-bold shadow-xl backdrop-blur-md active:scale-95"
          >
            🗺️
          </button>
          
          <div className={`px-4 py-2.5 rounded-2xl border-2 font-black text-xs tracking-wider shadow-xl backdrop-blur-md ${isImpostor ? 'bg-rose-950/80 border-rose-600 text-rose-400' : 'bg-cyan-950/80 border-cyan-600 text-cyan-400'}`}>
            {isImpostor ? 'ASSASSINO' : 'TRIPULANTE'}
          </div>
        </div>
      </div>

      {/* Critical Sabotage Banner Warning */}
      {sabotage.activeType && (sabotage.activeType === 'REACTOR' || sabotage.activeType === 'O2') && (
        <div className="self-center bg-rose-600/90 border-2 border-rose-400 text-white px-6 py-2 rounded-2xl font-black text-sm tracking-wider animate-bounce shadow-2xl backdrop-blur-md">
          ⚠️ ALERTA: {sabotage.activeType} MEMBRO TEMPO RESTANTE: {Math.ceil(sabotage.timer)}s
        </div>
      )}

      {/* Action Buttons Bottom Bar */}
      <div className="flex justify-end gap-3 pointer-events-auto mb-2">
        {/* Report Body Button */}
        {isAlive && (
          <button
            onClick={onReport}
            className="w-16 h-16 rounded-2xl bg-amber-600/90 border-2 border-amber-400 text-white font-bold flex flex-col items-center justify-center shadow-2xl active:scale-95 text-xs"
          >
            📢
            <span className="text-[10px]">RELATAR</span>
          </button>
        )}

        {/* Use / Interact Button */}
        {isAlive && (
          <button
            disabled={!nearbyInteractable}
            onClick={onUseInteract}
            className="w-16 h-16 rounded-2xl bg-cyan-600/90 disabled:bg-slate-800/80 disabled:border-slate-700 disabled:text-slate-600 border-2 border-cyan-400 text-white font-bold flex flex-col items-center justify-center shadow-2xl active:scale-95 text-xs"
          >
            ⚡
            <span className="text-[10px]">USAR</span>
          </button>
        )}

        {/* Impostor Kill Button */}
        {isImpostor && isAlive && (
          <button
            disabled={self.killCooldownRemaining > 0}
            onClick={onKill}
            className="w-16 h-16 rounded-2xl bg-rose-600/90 disabled:bg-slate-800/80 disabled:border-slate-700 disabled:text-slate-600 border-2 border-rose-400 text-white font-bold flex flex-col items-center justify-center shadow-2xl active:scale-95 text-xs relative"
          >
            🔪
            <span className="text-[10px]">MATAR</span>
            {self.killCooldownRemaining > 0 && (
              <span className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center font-mono font-bold text-sm text-white">
                {Math.ceil(self.killCooldownRemaining)}
              </span>
            )}
          </button>
        )}

        {/* Impostor Sabotage Button */}
        {isImpostor && isAlive && (
          <button
            disabled={self.sabotageCooldownRemaining > 0 || sabotage.activeType !== null}
            onClick={onSabotage}
            className="w-16 h-16 rounded-2xl bg-purple-600/90 disabled:bg-slate-800/80 disabled:border-slate-700 disabled:text-slate-600 border-2 border-purple-400 text-white font-bold flex flex-col items-center justify-center shadow-2xl active:scale-95 text-xs relative"
          >
            💣
            <span className="text-[10px]">SABOTAR</span>
          </button>
        )}
      </div>
    </div>
  );
};
