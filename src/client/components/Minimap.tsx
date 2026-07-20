import React from 'react';
import { PlayerPrivateData, PlayerPublicData } from '../../shared/types';
import { ROOMS, MAP_BOUNDS, TASK_DEFINITIONS } from '../../shared/mapData';

interface Props {
  self: PlayerPrivateData;
  onClose: () => void;
}

export const Minimap: React.FC<Props> = ({ self, onClose }) => {
  const scale = 0.25;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border-2 border-cyan-500/50 rounded-2xl p-6 w-full max-w-2xl shadow-2xl relative">
        <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-3">
          <h3 className="text-xl font-black text-cyan-400">MINIMAPA DA ESTAÇÃO</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white flex items-center justify-center font-bold"
          >
            ✕
          </button>
        </div>

        {/* Tactical Map Container */}
        <div 
          className="relative bg-slate-950 rounded-xl border border-slate-800 overflow-hidden mx-auto"
          style={{ width: MAP_BOUNDS.width * scale, height: MAP_BOUNDS.height * scale }}
        >
          {/* Rooms */}
          {ROOMS.map(room => (
            <div
              key={room.id}
              className="absolute border border-cyan-500/30 flex items-center justify-center text-[10px] font-bold text-slate-400/80 uppercase tracking-tighter"
              style={{
                left: room.x * scale,
                top: room.y * scale,
                width: room.width * scale,
                height: room.height * scale,
                backgroundColor: room.color
              }}
            >
              {room.name}
            </div>
          ))}

          {/* Task Markers for Crewmates */}
          {self.role === 'CREWMATE' && self.tasks.filter(t => !t.completed).map(task => (
            <div
              key={task.id}
              className="absolute w-3 h-3 bg-yellow-400 rounded-full border border-white -translate-x-1/2 -translate-y-1/2 animate-ping"
              style={{ left: task.x * scale, top: task.y * scale }}
            />
          ))}

          {/* Self Player Position Indicator */}
          <div
            className="absolute w-4 h-4 bg-emerald-400 rounded-full border-2 border-white -translate-x-1/2 -translate-y-1/2 shadow-lg shadow-emerald-400/80"
            style={{ left: self.x * scale, top: self.y * scale }}
          />
        </div>
      </div>
    </div>
  );
};
