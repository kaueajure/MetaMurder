import React, { useEffect, useRef } from 'react';
import { PlayerPrivateData } from '../../shared/types';
import { PLAYER_COLORS } from '../../shared/constants';
import { drawCharacter } from '../game/CharacterRenderer';
import { soundEngine } from '../audio/soundEffects';

interface Props {
  player: PlayerPrivateData;
  onComplete: () => void;
}

export const DeathOverlay: React.FC<Props> = ({ player, onComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onCompleteRef = useRef(onComplete);
  const color = PLAYER_COLORS.find(candidate => candidate.id === player.color) ?? PLAYER_COLORS[0];
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2 + 20);
      drawCharacter(ctx, { ...player, state: 'ALIVE', vx: 0, vy: 0 }, {
        scale: 2.15,
        showName: false,
        time: 0
      });
      ctx.restore();
    }

    soundEngine.playDeathSound();
    const completeTimer = window.setTimeout(() => onCompleteRef.current(), 3600);
    return () => window.clearTimeout(completeTimer);
  }, []);

  return (
    <div
      className="death-sequence fixed inset-0 z-[90] overflow-hidden pointer-events-none select-none"
      role="alert"
      aria-live="assertive"
      aria-label="Você morreu e agora é um fantasma"
    >
      <div className="death-blackout absolute inset-0 bg-[#02030a]" />
      <div className="death-red-flash absolute inset-0" />
      <div className="death-vignette absolute inset-0" />

      <div className="death-streak death-streak-one absolute" />
      <div className="death-streak death-streak-two absolute" />
      <div className="death-streak death-streak-three absolute" />

      <div className="death-character-wrap absolute inset-0 flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={260}
          height={260}
          className="death-character w-[220px] h-[220px] md:w-[280px] md:h-[280px]"
        />
        <div
          className="death-cut absolute h-2 w-[360px] md:w-[470px]"
          style={{ backgroundColor: color.hex, boxShadow: `0 0 30px ${color.hex}` }}
        />
      </div>

      <div className="death-message absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
        <div className="mb-5 flex items-center gap-3 text-rose-300">
          <span className="h-px w-12 bg-rose-500/60" />
          <span className="text-[10px] md:text-xs font-black tracking-[.45em] uppercase">
            Sinal vital perdido
          </span>
          <span className="h-px w-12 bg-rose-500/60" />
        </div>
        <h1 className="death-title text-5xl sm:text-7xl md:text-8xl font-black tracking-tight text-white">
          VOCÊ <span className="text-rose-500">MORREU</span>
        </h1>
        <p className="mt-5 text-base md:text-xl font-bold text-slate-200">
          Agora você é um fantasma.
        </p>
        <p className="mt-2 max-w-lg text-xs md:text-sm text-slate-400">
          Atravesse paredes e continue suas tarefas. Jogadores vivos não conseguem ver você.
        </p>
        <div className="mt-7 border border-violet-300/30 bg-violet-500/10 px-5 py-2 text-[10px] font-black uppercase tracking-[.25em] text-violet-200">
          Modo fantasma liberado
        </div>
      </div>
    </div>
  );
};
