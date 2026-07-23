import React from 'react';
import { ROOMS, VENTS } from '../../shared/mapData';

interface Props {
  currentVentId: string;
  onTravel: (ventId: string) => void;
  onExit: () => void;
}

export const VentTravelPanel: React.FC<Props> = ({ currentVentId, onTravel, onExit }) => {
  const currentVent = VENTS.find(vent => vent.id === currentVentId);
  if (!currentVent) return null;
  const currentRoom = ROOMS.find(room => room.id === currentVent.roomId)?.name ?? currentVent.roomId;

  return (
    <aside className="fixed z-40 left-1/2 bottom-6 -translate-x-1/2 pointer-events-auto min-w-[320px] border border-violet-300/35 bg-slate-950/95 shadow-[0_0_40px_rgba(139,92,246,.22)] backdrop-blur-md">
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-4">
        <div>
          <p className="text-[9px] uppercase tracking-[.25em] text-violet-300/65 font-bold">Rede de dutos</p>
          <strong className="text-sm text-white">{currentRoom}</strong>
        </div>
        <button
          onClick={onExit}
          className="px-4 py-2 bg-amber-400 text-slate-950 text-xs font-black hover:bg-amber-300"
        >
          SAIR DO DUTO
        </button>
      </div>
      <div className="p-3 grid grid-cols-2 gap-2">
        {currentVent.connectsTo.map(ventId => {
          const destination = VENTS.find(vent => vent.id === ventId);
          if (!destination) return null;
          const roomName = ROOMS.find(room => room.id === destination.roomId)?.name ?? destination.roomId;
          return (
            <button
              key={ventId}
              onClick={() => onTravel(ventId)}
              className="px-3 py-3 border border-violet-300/20 bg-violet-500/10 text-left hover:bg-violet-400/20 hover:border-violet-300/50"
            >
              <span className="block text-[9px] text-violet-300/60 font-mono">CONECTADO</span>
              <strong className="text-xs text-white">{roomName} →</strong>
            </button>
          );
        })}
      </div>
    </aside>
  );
};
