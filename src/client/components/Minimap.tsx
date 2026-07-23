import React from 'react';
import { PlayerPrivateData } from '../../shared/types';
import { CORRIDOR_AREAS, MAP_BOUNDS, MAP_OBSTACLES, ROOMS } from '../../shared/mapData';

interface Props {
  self: PlayerPrivateData;
  onClose: () => void;
}

export const Minimap: React.FC<Props> = ({ self, onClose }) => {
  const scale = 0.25;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-stone-100 border border-stone-400 rounded-lg p-6 w-full max-w-2xl shadow-2xl relative">
        <div className="flex justify-between items-center mb-4 border-b border-stone-300 pb-3">
          <h3 className="text-xl font-black text-stone-800">PLANTA DO ESCRITÓRIO</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-300 text-stone-700 hover:bg-stone-400 flex items-center justify-center font-bold"
          >
            ✕
          </button>
        </div>

        {/* Tactical Map Container */}
        <div 
          className="relative bg-stone-300 border border-stone-500 overflow-hidden mx-auto"
          style={{ width: MAP_BOUNDS.width * scale, height: MAP_BOUNDS.height * scale }}
        >
          {CORRIDOR_AREAS.map(area => (
            <div
              key={area.id}
              className="absolute border-y border-stone-400 bg-stone-100 flex items-center justify-center text-[8px] font-black tracking-[.35em] text-stone-500"
              style={{
                left: area.x * scale,
                top: area.y * scale,
                width: area.width * scale,
                height: area.height * scale
              }}
            >
              CORREDOR
            </div>
          ))}

          {/* Rooms */}
          {ROOMS.map(room => (
            <div
              key={room.id}
              className="absolute border border-stone-400 flex items-center justify-center text-[10px] font-bold text-stone-700 uppercase tracking-tighter"
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

          {MAP_OBSTACLES.map(obstacle => (
            <div
              key={obstacle.id}
              className="absolute border border-stone-500 bg-stone-500/65"
              style={{
                left: obstacle.x * scale,
                top: obstacle.y * scale,
                width: Math.max(2, obstacle.width * scale),
                height: Math.max(2, obstacle.height * scale)
              }}
            />
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
