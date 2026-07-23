import React, { useEffect, useRef } from 'react';
import { PlayerCustomization, PlayerPublicData } from '../../shared/types';
import { drawCharacter } from '../game/CharacterRenderer';

interface Props {
  customization: PlayerCustomization;
  name?: string;
  className?: string;
}

export const CharacterPreview: React.FC<Props> = ({
  customization,
  name = '',
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    let animationFrame = 0;
    const player: PlayerPublicData = {
      id: 'preview',
      name,
      isBot: false,
      color: customization.color,
      hatId: customization.hatId,
      skinId: customization.skinId,
      x: 0,
      y: 0,
      vx: 28,
      vy: 0,
      facing: 'RIGHT',
      state: 'ALIVE',
      isReady: true,
      isHost: false,
      inVent: false,
      currentVentId: null
    };

    const render = (time: number) => {
      const rect = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round(rect.width * pixelRatio));
      const height = Math.max(1, Math.round(rect.height * pixelRatio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, rect.width, rect.height);
      context.save();
      context.translate(rect.width / 2, rect.height * 0.64);
      drawCharacter(context, player, {
        scale: Math.min(rect.width / 115, rect.height / 125),
        showName: Boolean(name),
        preview: true,
        time
      });
      context.restore();
      animationFrame = requestAnimationFrame(render);
    };

    animationFrame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrame);
  }, [customization, name]);

  return <canvas ref={canvasRef} className={`block w-full h-full ${className}`} />;
};
