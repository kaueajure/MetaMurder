import React, { useState, useRef } from 'react';
import { PlayerPrivateData, SabotageState } from '../../shared/types';
import { soundEngine } from '../audio/soundEffects';

interface Props {
  self: PlayerPrivateData;
  completedTasks: number;
  totalTasks: number;
  sabotage: SabotageState;
  nearbyInteractable: string | null;
  canReport: boolean;
  onJoystickMove: (dir: { x: number; y: number }) => void;
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
  canReport,
  onJoystickMove,
  onUseInteract,
  onKill,
  onReport,
  onSabotage,
  onVent,
  onToggleMinimap
}) => {
  const isImpostor = self.role === 'IMPOSTOR';
  const isAlive = self.state === 'ALIVE';
  const isGhost = self.state === 'DEAD' || self.state === 'GHOST';
  const canUse = isAlive || (isGhost && !isImpostor);
  const taskPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Joystick touch/mouse state
  const joystickRef = useRef<HTMLDivElement>(null);
  const [joystickActive, setJoystickActive] = useState(false);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });

  const handleJoystickStart = (clientX: number, clientY: number) => {
    if (!joystickRef.current) return;
    setJoystickActive(true);
    updateJoystick(clientX, clientY);
  };

  const handleJoystickMove = (clientX: number, clientY: number) => {
    if (!joystickActive || !joystickRef.current) return;
    updateJoystick(clientX, clientY);
  };

  const updateJoystick = (clientX: number, clientY: number) => {
    if (!joystickRef.current) return;
    const rect = joystickRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const radius = rect.width / 2;

    const distance = Math.sqrt(dx * dx + dy * dy);
    const clampedDist = Math.min(distance, radius);

    const angle = Math.atan2(dy, dx);
    const knobX = Math.cos(angle) * clampedDist;
    const knobY = Math.sin(angle) * clampedDist;

    setKnobPos({ x: knobX, y: knobY });

    const normX = clampedDist > 10 ? Math.cos(angle) : 0;
    const normY = clampedDist > 10 ? Math.sin(angle) : 0;

    onJoystickMove({ x: normX, y: normY });
  };

  const handleJoystickEnd = () => {
    setJoystickActive(false);
    setKnobPos({ x: 0, y: 0 });
    onJoystickMove({ x: 0, y: 0 });
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-30 flex flex-col justify-between p-4 md:p-5 select-none">
      {/* Top Header */}
      <div className="flex justify-between items-start pointer-events-auto">
        {/* Task Progress Bar */}
        <div className="bg-black/45 border-l-2 border-cyan-300/70 px-4 py-2.5 shadow-2xl backdrop-blur-md min-w-[240px]">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-bold text-slate-400 font-mono">PROGRESSO DAS TAREFAS</span>
            <span className="text-xs font-mono font-bold text-emerald-400">{completedTasks}/{totalTasks}</span>
          </div>
          <div className="w-full bg-black/60 h-2 overflow-hidden border border-white/10">
            <div 
              className="bg-gradient-to-r from-cyan-400 to-emerald-300 h-full transition-all duration-300 shadow-[0_0_10px_rgba(52,211,153,.7)]"
              style={{ width: `${taskPercent}%` }}
            />
          </div>
        </div>

        {/* Role Badge & Minimap */}
        <div className="flex gap-3">
          <button
            onClick={() => { soundEngine.playButtonClick(); onToggleMinimap(); }}
            className="w-11 h-11 rounded-full bg-black/45 border border-cyan-200/20 text-cyan-300 hover:text-white hover:border-cyan-200/50 flex items-center justify-center shadow-xl backdrop-blur-md active:scale-95 text-lg"
          >
            🗺️
          </button>
          
          <div className={`px-4 py-2.5 border-l-2 font-black text-[10px] tracking-[.2em] shadow-xl backdrop-blur-md ${
            isGhost
              ? 'bg-violet-950/65 border-violet-300 text-violet-200'
              : isImpostor
                ? 'bg-rose-950/65 border-rose-400 text-rose-300'
                : 'bg-cyan-950/55 border-cyan-300 text-cyan-200'
          }`}>
            {isGhost ? 'FANTASMA' : isImpostor ? 'ASSASSINO' : 'TRIPULANTE'}
          </div>
        </div>
      </div>

      {/* Critical Sabotage Banner */}
      {sabotage.activeType && (sabotage.activeType === 'REACTOR' || sabotage.activeType === 'O2') && (
        <div className="self-center bg-rose-600/90 border-2 border-rose-400 text-white px-6 py-2 rounded-2xl font-black text-sm tracking-wider animate-bounce shadow-2xl backdrop-blur-md">
          ⚠️ ALERTA: {sabotage.activeType} MEMBRO TEMPO RESTANTE: {Math.ceil(sabotage.timer)}s
        </div>
      )}

      {/* Bottom Controls Bar (Joystick Left, Action Buttons Right) */}
      <div className="flex justify-between items-end w-full pb-2">
        {/* Virtual Joystick (Touch / Mouse) */}
        <div
          ref={joystickRef}
          onMouseDown={e => handleJoystickStart(e.clientX, e.clientY)}
          onMouseMove={e => handleJoystickMove(e.clientX, e.clientY)}
          onMouseUp={handleJoystickEnd}
          onMouseLeave={handleJoystickEnd}
          onTouchStart={e => handleJoystickStart(e.touches[0].clientX, e.touches[0].clientY)}
          onTouchMove={e => handleJoystickMove(e.touches[0].clientX, e.touches[0].clientY)}
          onTouchEnd={handleJoystickEnd}
          className="w-32 h-32 rounded-full bg-[radial-gradient(circle,rgba(15,23,42,.35),rgba(2,6,23,.7))] border border-cyan-200/25 relative flex items-center justify-center pointer-events-auto shadow-[inset_0_0_30px_rgba(34,211,238,.08),0_15px_40px_rgba(0,0,0,.5)] backdrop-blur-md touch-none"
        >
          {/* Inner Joystick Knob */}
          <div
            className="w-14 h-14 rounded-full bg-[radial-gradient(circle_at_35%_30%,#a5f3fc,#0891b2_55%,#164e63)] border border-cyan-100/80 shadow-[0_0_20px_rgba(34,211,238,.45)] pointer-events-none transition-transform duration-75"
            style={{ transform: `translate(${knobPos.x}px, ${knobPos.y}px)` }}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pointer-events-auto">
          {/* Report Body Button */}
          {isAlive && canReport && (
            <button
              onClick={() => { soundEngine.playButtonClick(); onReport(); }}
              className="w-20 h-20 rounded-full bg-[radial-gradient(circle_at_35%_25%,#fcd34d,#d97706_60%,#78350f)] hover:brightness-110 border border-amber-100/70 text-white font-bold flex flex-col items-center justify-center shadow-[0_0_24px_rgba(245,158,11,.35),0_12px_30px_rgba(0,0,0,.45)] active:scale-95 text-xs transition-all"
            >
              <span className="text-2xl mb-1">📢</span>
              <span className="text-[11px] font-black">RELATAR</span>
            </button>
          )}

          {/* Use / Interact Button */}
          {canUse && (
            <button
              disabled={!nearbyInteractable}
              onClick={() => { soundEngine.playButtonClick(); onUseInteract(); }}
              className={`w-20 h-20 rounded-full border font-bold flex flex-col items-center justify-center shadow-2xl active:scale-95 text-xs transition-all ${
                nearbyInteractable 
                  ? 'bg-[radial-gradient(circle_at_35%_25%,#6ee7b7,#059669_60%,#064e3b)] hover:brightness-110 border-emerald-100/70 text-white animate-pulse scale-105 shadow-emerald-500/50'
                  : 'bg-black/55 border-white/10 text-slate-600'
              }`}
            >
              <span className="text-2xl mb-1">⚡</span>
              <span className="text-[11px] font-black">{isGhost ? 'TAREFA' : 'USAR'}</span>
            </button>
          )}

          {/* Impostor Kill Button */}
          {isImpostor && isAlive && (
            <button
              disabled={self.killCooldownRemaining > 0}
              onClick={() => { soundEngine.playButtonClick(); onKill(); }}
              className="w-20 h-20 rounded-full bg-[radial-gradient(circle_at_35%_25%,#fb7185,#e11d48_58%,#881337)] hover:brightness-110 disabled:bg-slate-900/80 disabled:border-slate-800 disabled:text-slate-600 border border-rose-200/70 text-white font-bold flex flex-col items-center justify-center shadow-[0_0_24px_rgba(244,63,94,.35),0_12px_30px_rgba(0,0,0,.45)] active:scale-95 text-xs relative transition-all"
            >
              <span className="text-2xl mb-1">🔪</span>
              <span className="text-[11px] font-black">MATAR</span>
              {self.killCooldownRemaining > 0 && (
                <span className="absolute inset-0 bg-slate-950/85 rounded-full flex items-center justify-center font-mono font-bold text-sm text-white">
                  {Math.ceil(self.killCooldownRemaining)}s
                </span>
              )}
            </button>
          )}

          {/* Impostor Sabotage Button */}
          {isImpostor && isAlive && (
            <button
              disabled={self.sabotageCooldownRemaining > 0 || sabotage.activeType !== null}
              onClick={() => { soundEngine.playButtonClick(); onSabotage(); }}
              className="w-20 h-20 rounded-full bg-[radial-gradient(circle_at_35%_25%,#c084fc,#9333ea_58%,#581c87)] hover:brightness-110 disabled:bg-slate-900/80 disabled:border-slate-800 disabled:text-slate-600 border border-purple-200/70 text-white font-bold flex flex-col items-center justify-center shadow-[0_0_24px_rgba(168,85,247,.32),0_12px_30px_rgba(0,0,0,.45)] active:scale-95 text-xs relative transition-all"
            >
              <span className="text-2xl mb-1">💣</span>
              <span className="text-[11px] font-black">SABOTAR</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
