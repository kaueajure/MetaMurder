import React, { useState, useRef } from 'react';
import { PlayerPrivateData, SabotageState } from '../../shared/types';
import { soundEngine } from '../audio/soundEffects';

interface Props {
  self: PlayerPrivateData;
  completedTasks: number;
  totalTasks: number;
  sabotage: SabotageState;
  nearbyInteractable: string | null;
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
    <div className="fixed inset-0 pointer-events-none z-30 flex flex-col justify-between p-4 select-none">
      {/* Top Header */}
      <div className="flex justify-between items-start pointer-events-auto">
        {/* Task Progress Bar */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 shadow-xl backdrop-blur-md min-w-[240px]">
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

        {/* Role Badge & Minimap */}
        <div className="flex gap-3">
          <button
            onClick={() => { soundEngine.playButtonClick(); onToggleMinimap(); }}
            className="w-12 h-12 rounded-2xl bg-slate-900/90 border border-slate-800 text-cyan-400 hover:text-white flex items-center justify-center font-bold shadow-xl backdrop-blur-md active:scale-95 text-xl"
          >
            🗺️
          </button>
          
          <div className={`px-4 py-2.5 rounded-2xl border-2 font-black text-xs tracking-wider shadow-xl backdrop-blur-md ${isImpostor ? 'bg-rose-950/80 border-rose-600 text-rose-400' : 'bg-cyan-950/80 border-cyan-600 text-cyan-400'}`}>
            {isImpostor ? 'ASSASSINO' : 'TRIPULANTE'}
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
          className="w-32 h-32 rounded-full bg-slate-900/60 border-2 border-cyan-500/40 relative flex items-center justify-center pointer-events-auto shadow-2xl backdrop-blur-md touch-none"
        >
          {/* Inner Joystick Knob */}
          <div
            className="w-14 h-14 rounded-full bg-cyan-500/80 border-2 border-white shadow-lg pointer-events-none transition-transform duration-75"
            style={{ transform: `translate(${knobPos.x}px, ${knobPos.y}px)` }}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pointer-events-auto">
          {/* Report Body Button */}
          {isAlive && (
            <button
              onClick={() => { soundEngine.playButtonClick(); onReport(); }}
              className="w-20 h-20 rounded-2xl bg-amber-600 hover:bg-amber-500 border-2 border-amber-300 text-white font-bold flex flex-col items-center justify-center shadow-2xl active:scale-95 text-xs transition-transform"
            >
              <span className="text-2xl mb-1">📢</span>
              <span className="text-[11px] font-black">RELATAR</span>
            </button>
          )}

          {/* Use / Interact Button */}
          {isAlive && (
            <button
              disabled={!nearbyInteractable}
              onClick={() => { soundEngine.playButtonClick(); onUseInteract(); }}
              className={`w-20 h-20 rounded-2xl border-2 font-bold flex flex-col items-center justify-center shadow-2xl active:scale-95 text-xs transition-all ${
                nearbyInteractable 
                  ? 'bg-emerald-500 hover:bg-emerald-400 border-emerald-300 text-white animate-pulse scale-105 shadow-emerald-500/50' 
                  : 'bg-slate-900/80 border-slate-800 text-slate-600'
              }`}
            >
              <span className="text-2xl mb-1">⚡</span>
              <span className="text-[11px] font-black">USAR</span>
            </button>
          )}

          {/* Impostor Kill Button */}
          {isImpostor && isAlive && (
            <button
              disabled={self.killCooldownRemaining > 0}
              onClick={() => { soundEngine.playButtonClick(); onKill(); }}
              className="w-20 h-20 rounded-2xl bg-rose-600 hover:bg-rose-500 disabled:bg-slate-900/80 disabled:border-slate-800 disabled:text-slate-600 border-2 border-rose-400 text-white font-bold flex flex-col items-center justify-center shadow-2xl active:scale-95 text-xs relative transition-transform"
            >
              <span className="text-2xl mb-1">🔪</span>
              <span className="text-[11px] font-black">MATAR</span>
              {self.killCooldownRemaining > 0 && (
                <span className="absolute inset-0 bg-slate-950/80 rounded-2xl flex items-center justify-center font-mono font-bold text-sm text-white">
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
              className="w-20 h-20 rounded-2xl bg-purple-600 hover:bg-purple-500 disabled:bg-slate-900/80 disabled:border-slate-800 disabled:text-slate-600 border-2 border-purple-400 text-white font-bold flex flex-col items-center justify-center shadow-2xl active:scale-95 text-xs relative transition-transform"
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
