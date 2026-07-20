import React, { useRef, useEffect, useState } from 'react';
import { PlayerPrivateData, PlayerPublicData, DeadBody, SabotageState, MeetingState, ChatMessage } from '../../shared/types';
import { Renderer } from '../game/Renderer';
import { InputHandler } from '../game/InputHandler';
import { HUD } from './HUD';
import { Minimap } from './Minimap';
import { MeetingOverlay } from './MeetingOverlay';
import { TaskOverlay } from './TaskOverlay';
import { SabotageOverlay } from './SabotageOverlay';
import { EMERGENCY_BUTTON_POS, SABOTAGE_NODES } from '../../shared/mapData';
import { socket } from '../socket';
import { SOCKET_EVENTS } from '../../shared/protocol';

interface Props {
  self: PlayerPrivateData;
  players: PlayerPublicData[];
  bodies: DeadBody[];
  sabotage: SabotageState;
  meeting: MeetingState | null;
  chatMessages: ChatMessage[];
  totalTaskCount: number;
  completedTaskCount: number;
}

export const GameView: React.FC<Props> = ({
  self,
  players,
  bodies,
  sabotage,
  meeting,
  chatMessages,
  totalTaskCount,
  completedTaskCount
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const inputHandlerRef = useRef<InputHandler | null>(null);

  // Client-side local prediction position for 60 FPS smooth movement
  const localPosRef = useRef<{ x: number; y: number }>({ x: self.x, y: self.y });

  const [activeTask, setActiveTask] = useState<any | null>(null);
  const [activeSabotageFix, setActiveSabotageFix] = useState<boolean>(false);
  const [showMinimap, setShowMinimap] = useState<boolean>(false);
  const [nearbyInteractable, setNearbyInteractable] = useState<string | null>(null);

  // Reconcile server position updates
  useEffect(() => {
    // If distance from server is large, snap to server position
    const dx = self.x - localPosRef.current.x;
    const dy = self.y - localPosRef.current.y;
    if (Math.sqrt(dx * dx + dy * dy) > 100) {
      localPosRef.current = { x: self.x, y: self.y };
    }
  }, [self.x, self.y]);

  // Canvas setup & resize
  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.width = window.innerWidth;
      canvasRef.current.height = window.innerHeight;
      rendererRef.current = new Renderer(canvasRef.current);
      inputHandlerRef.current = new InputHandler();

      const handleResize = () => {
        if (canvasRef.current) {
          canvasRef.current.width = window.innerWidth;
          canvasRef.current.height = window.innerHeight;
        }
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  // Check nearby interactables (Task Stations, Emergency Button, Sabotage Breaker)
  useEffect(() => {
    if (self.state !== 'ALIVE') return;

    const posX = localPosRef.current.x;
    const posY = localPosRef.current.y;

    // Check emergency button
    const distButton = Math.sqrt(Math.pow(posX - EMERGENCY_BUTTON_POS.x, 2) + Math.pow(posY - EMERGENCY_BUTTON_POS.y, 2));
    if (distButton < 110) {
      setNearbyInteractable('EMERGENCY_BUTTON');
      return;
    }

    // Check tasks for crewmate
    if (self.role === 'CREWMATE') {
      for (const t of self.tasks) {
        if (!t.completed) {
          const d = Math.sqrt(Math.pow(posX - t.x, 2) + Math.pow(posY - t.y, 2));
          if (d < 110) { // Expanded interaction radius for easy access
            setNearbyInteractable(t.id);
            return;
          }
        }
      }
    }

    // Check sabotage nodes
    if (sabotage.activeType) {
      if (sabotage.activeType === 'LIGHTS') {
        const node = SABOTAGE_NODES.LIGHTS_BREAKER;
        if (Math.sqrt(Math.pow(posX - node.x, 2) + Math.pow(posY - node.y, 2)) < 110) {
          setNearbyInteractable('LIGHTS_BREAKER');
          return;
        }
      }
    }

    setNearbyInteractable(null);
  }, [self.tasks, self.role, self.state, sabotage]);

  // Main Render & Local Movement Loop (60 FPS)
  useEffect(() => {
    let animFrameId: number;
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      if (inputHandlerRef.current && self.state === 'ALIVE' && !meeting && !activeTask && !activeSabotageFix) {
        const state = inputHandlerRef.current.getInputState();
        if (state.moveX !== 0 || state.moveY !== 0) {
          const speed = 190 * (self as any).playerSpeed || 190;
          const vx = state.moveX * speed;
          const vy = state.moveY * speed;
          const facing = state.moveX < 0 ? 'LEFT' : 'RIGHT';

          // Update local predicted position immediately
          localPosRef.current.x += vx * dt;
          localPosRef.current.y += vy * dt;

          // Emit move command to server
          socket.emit(SOCKET_EVENTS.C2S_MOVE, {
            x: localPosRef.current.x,
            y: localPosRef.current.y,
            vx,
            vy,
            facing
          });
        }

        // Check key shortcut 'E' or Space to trigger interaction
        if (state.isInteracting && nearbyInteractable) {
          handleInteract();
        }
      }

      if (rendererRef.current) {
        const predictedSelf = { ...self, x: localPosRef.current.x, y: localPosRef.current.y };
        rendererRef.current.render(predictedSelf, players, bodies, sabotage, nearbyInteractable);
      }

      animFrameId = requestAnimationFrame(loop);
    };

    animFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameId);
  }, [self, players, bodies, sabotage, meeting, activeTask, activeSabotageFix, nearbyInteractable]);

  const handleInteract = () => {
    if (!nearbyInteractable) return;

    if (nearbyInteractable === 'EMERGENCY_BUTTON') {
      socket.emit(SOCKET_EVENTS.C2S_CALL_MEETING);
    } else if (nearbyInteractable === 'LIGHTS_BREAKER') {
      setActiveSabotageFix(true);
    } else {
      const task = self.tasks.find(t => t.id === nearbyInteractable);
      if (task) {
        setActiveTask(task);
      }
    }
  };

  const handleKill = () => {
    const posX = localPosRef.current.x;
    const posY = localPosRef.current.y;

    const targets = players.filter(p => p.id !== self.id && p.state === 'ALIVE');
    const closest = targets.find(p => Math.sqrt(Math.pow(posX - p.x, 2) + Math.pow(posY - p.y, 2)) < 110);
    if (closest) {
      socket.emit(SOCKET_EVENTS.C2S_KILL, { targetId: closest.id });
    }
  };

  const handleReport = () => {
    const posX = localPosRef.current.x;
    const posY = localPosRef.current.y;

    const closestBody = bodies.find(b => Math.sqrt(Math.pow(posX - b.x, 2) + Math.pow(posY - b.y, 2)) < 140);
    if (closestBody) {
      socket.emit(SOCKET_EVENTS.C2S_REPORT_BODY, { bodyId: closestBody.id });
    }
  };

  const handleSabotage = () => {
    socket.emit(SOCKET_EVENTS.C2S_TRIGGER_SABOTAGE, { type: 'LIGHTS' });
  };

  const predictedSelf = { ...self, x: localPosRef.current.x, y: localPosRef.current.y };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950">
      <canvas ref={canvasRef} className="absolute inset-0 block cursor-pointer" />

      {!meeting && (
        <HUD
          self={predictedSelf}
          completedTasks={completedTaskCount}
          totalTasks={totalTaskCount}
          sabotage={sabotage}
          nearbyInteractable={nearbyInteractable}
          onUseInteract={handleInteract}
          onKill={handleKill}
          onReport={handleReport}
          onSabotage={handleSabotage}
          onVent={() => {}}
          onToggleMinimap={() => setShowMinimap(!showMinimap)}
        />
      )}

      {showMinimap && <Minimap self={predictedSelf} onClose={() => setShowMinimap(false)} />}

      {activeTask && (
        <TaskOverlay
          task={activeTask}
          onComplete={() => {
            socket.emit(SOCKET_EVENTS.C2S_COMPLETE_TASK, { taskId: activeTask.id });
            setActiveTask(null);
          }}
          onClose={() => setActiveTask(null)}
        />
      )}

      {activeSabotageFix && (
        <SabotageOverlay
          sabotage={sabotage}
          onResolveNode={(nodeId) => socket.emit(SOCKET_EVENTS.C2S_RESOLVE_SABOTAGE_NODE, { nodeId })}
          onClose={() => setActiveSabotageFix(false)}
        />
      )}

      {meeting && (
        <MeetingOverlay
          meeting={meeting}
          players={players}
          self={self}
          chatMessages={chatMessages}
          onCastVote={(targetId) => socket.emit(SOCKET_EVENTS.C2S_CAST_VOTE, { targetId })}
          onSendMessage={(text) => socket.emit(SOCKET_EVENTS.C2S_SEND_CHAT, { text })}
        />
      )}
    </div>
  );
};
