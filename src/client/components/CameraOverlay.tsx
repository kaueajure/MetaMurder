import React, { useEffect, useRef, useState } from 'react';
import { DeadBody, PlayerPublicData } from '../../shared/types';
import { SECURITY_CAMERAS } from '../../shared/mapData';
import { Renderer } from '../game/Renderer';

interface Props {
  players: PlayerPublicData[];
  bodies: DeadBody[];
  onClose: () => void;
}

export const CameraOverlay: React.FC<Props> = ({ players, bodies, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const latestRef = useRef({ players, bodies });
  const cameraIndexRef = useRef(0);
  const [cameraIndex, setCameraIndex] = useState(0);
  latestRef.current = { players, bodies };
  cameraIndexRef.current = cameraIndex;

  useEffect(() => {
    if (!canvasRef.current) return;
    canvasRef.current.width = 960;
    canvasRef.current.height = 540;
    rendererRef.current = new Renderer(canvasRef.current);
    let frameId = 0;

    const render = () => {
      const camera = SECURITY_CAMERAS[cameraIndexRef.current];
      if (camera && rendererRef.current) {
        rendererRef.current.renderCameraFeed(camera, latestRef.current.players, latestRef.current.bodies);
      }
      frameId = requestAnimationFrame(render);
    };
    frameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') selectRelative(-1);
      if (event.key === 'ArrowRight') selectRelative(1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const selectRelative = (direction: number) => {
    setCameraIndex(current =>
      (current + direction + SECURITY_CAMERAS.length) % SECURITY_CAMERAS.length
    );
  };

  const activeCamera = SECURITY_CAMERAS[cameraIndex];

  return (
    <div className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-md flex items-center justify-center p-3 md:p-8">
      <section className="w-full max-w-6xl border border-cyan-300/35 bg-[#02060d] shadow-[0_0_70px_rgba(34,211,238,.16)]">
        <header className="h-16 px-5 flex items-center justify-between border-b border-cyan-300/20 bg-slate-950">
          <div>
            <p className="text-[9px] uppercase tracking-[.35em] text-cyan-300/60 font-bold">Central de segurança</p>
            <h2 className="text-lg font-black text-white">CÂMERAS AO VIVO · {activeCamera.name.toUpperCase()}</h2>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2 text-[10px] font-black text-rose-400 tracking-widest">
              <i className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_10px_#ef4444]" />
              REC
            </span>
            <button
              onClick={onClose}
              aria-label="Fechar câmeras"
              className="w-9 h-9 border border-white/15 text-slate-300 hover:text-white hover:border-white/40"
            >
              ✕
            </button>
          </div>
        </header>

        <div className="relative aspect-video overflow-hidden bg-black">
          <canvas ref={canvasRef} className="w-full h-full object-cover" />
          <div className="pointer-events-none absolute inset-4 border border-cyan-200/20">
            <span className="absolute left-2 top-2 text-[9px] font-mono text-cyan-200/70">
              {activeCamera.id.toUpperCase()} · SINAL ESTÁVEL
            </span>
            <span className="absolute right-2 bottom-2 text-[9px] font-mono text-cyan-200/50">
              AO VIVO
            </span>
          </div>
          <button
            onClick={() => selectRelative(-1)}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-20 bg-black/60 border border-white/15 text-2xl hover:border-cyan-300/60"
          >
            ‹
          </button>
          <button
            onClick={() => selectRelative(1)}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-20 bg-black/60 border border-white/15 text-2xl hover:border-cyan-300/60"
          >
            ›
          </button>
        </div>

        <footer className="grid grid-cols-2 sm:grid-cols-5 border-t border-white/10">
          {SECURITY_CAMERAS.map((camera, index) => (
            <button
              key={camera.id}
              onClick={() => setCameraIndex(index)}
              className={`px-3 py-3 text-[10px] font-black border-r border-white/10 transition-colors ${
                index === cameraIndex
                  ? 'bg-cyan-300 text-slate-950'
                  : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {String(index + 1).padStart(2, '0')} · {camera.name.toUpperCase()}
            </button>
          ))}
        </footer>
      </section>
    </div>
  );
};
