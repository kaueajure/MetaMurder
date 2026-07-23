import React, { useRef, useEffect, useState } from 'react';
import { PlayerPrivateData, PlayerPublicData, DeadBody, SabotageState, MeetingState, ChatMessage, PlayerTask } from '../../shared/types';
import { Renderer } from '../game/Renderer';
import { InputHandler } from '../game/InputHandler';
import { HUD } from './HUD';
import { Minimap } from './Minimap';
import { MeetingOverlay } from './MeetingOverlay';
import { TaskOverlay } from './TaskOverlay';
import { SabotageOverlay } from './SabotageOverlay';
import { SABOTAGE_NODES } from '../../shared/mapData';
import { clampPosition, hasLineOfSight } from '../../shared/mapCollision';
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

  // Smooth 60 FPS client prediction position
  const localPosRef = useRef<{ x: number; y: number }>({ x: self.x, y: self.y });

  const [activeTask, setActiveTask] = useState<PlayerTask | null>(null);
  const [activeSabotageFix, setActiveSabotageFix] = useState<boolean>(false);
  const [showMinimap, setShowMinimap] = useState<boolean>(false);
  const [nearbyInteractable, setNearbyInteractable] = useState<string | null>(null);
  const [nearbyBodyId, setNearbyBodyId] = useState<string | null>(null);

  // Reconcile server position if server lags behind
  useEffect(() => {
    const dx = self.x - localPosRef.current.x;
    const dy = self.y - localPosRef.current.y;
    if (Math.sqrt(dx * dx + dy * dy) > 120) {
      localPosRef.current = { x: self.x, y: self.y };
    }
  }, [self.x, self.y]);

  // Canvas & Input Handler Setup
  useEffect(() => {
    if (!canvasRef.current) return;
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
    return () => {
      window.removeEventListener('resize', handleResize);
      inputHandlerRef.current?.destroy();
      inputHandlerRef.current = null;
      rendererRef.current = null;
    };
  }, []);

  // Main 60 FPS Render & Movement & Interaction Check Loop
  useEffect(() => {
    let animFrameId: number;
    let lastTime = performance.now();
    let moveThrottleTimer = 0;

    const loop = (currentTime: number) => {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;
      moveThrottleTimer += dt;

      if (inputHandlerRef.current && self.state === 'ALIVE' && !meeting && !activeTask && !activeSabotageFix) {
        const state = inputHandlerRef.current.getInputState();
        
        if (state.moveX !== 0 || state.moveY !== 0) {
          const speed = 210; // Fluid walking speed
          const vx = state.moveX * speed;
          const vy = state.moveY * speed;
          const facing = state.moveX < 0 ? 'LEFT' : 'RIGHT';

          // Move local position smoothly at 60 FPS
          localPosRef.current = clampPosition(localPosRef.current, {
            x: localPosRef.current.x + vx * dt,
            y: localPosRef.current.y + vy * dt
          });

          // Throttle socket C2S_MOVE updates to 30Hz
          if (moveThrottleTimer >= 0.033) {
            moveThrottleTimer = 0;
            socket.emit(SOCKET_EVENTS.C2S_MOVE, {
              x: localPosRef.current.x,
              y: localPosRef.current.y,
              vx,
              vy,
              facing
            });
          }
        }

        // Calculate nearby interactable on EVERY FRAME
        const posX = localPosRef.current.x;
        const posY = localPosRef.current.y;

        let detectedInteractable: string | null = null;

        // Check Crewmate Tasks
        if (self.role === 'CREWMATE') {
          for (const t of self.tasks) {
            if (!t.completed) {
              const d = Math.sqrt(Math.pow(posX - t.x, 2) + Math.pow(posY - t.y, 2));
              if (d < 120 && hasLineOfSight({ x: posX, y: posY }, t)) {
                detectedInteractable = t.id;
                break;
              }
            }
          }
        }

        // Check Sabotage Nodes
        if (!detectedInteractable && sabotage.activeType === 'LIGHTS') {
          const node = SABOTAGE_NODES.LIGHTS_BREAKER;
          if (Math.sqrt(Math.pow(posX - node.x, 2) + Math.pow(posY - node.y, 2)) < 120) {
            detectedInteractable = 'LIGHTS_BREAKER';
          }
        }

        if (detectedInteractable !== nearbyInteractable) {
          setNearbyInteractable(detectedInteractable);
        }

        const closestBody = bodies
          .filter(body => !body.reported)
          .map(body => ({
            id: body.id,
            distance: Math.hypot(posX - body.x, posY - body.y)
          }))
          .filter(body => {
            const sourceBody = bodies.find(candidate => candidate.id === body.id)!;
            return body.distance <= 150 &&
              hasLineOfSight({ x: posX, y: posY }, sourceBody);
          })
          .sort((a, b) => a.distance - b.distance)[0];
        const detectedBodyId = closestBody?.id ?? null;
        if (detectedBodyId !== nearbyBodyId) {
          setNearbyBodyId(detectedBodyId);
        }

        // Auto trigger interaction if 'E' or Space pressed
        if (state.isInteracting && detectedInteractable) {
          triggerInteract(detectedInteractable);
        }
      }

      // Render Scene
      if (rendererRef.current) {
        const predictedSelf = { ...self, x: localPosRef.current.x, y: localPosRef.current.y };
        rendererRef.current.render(predictedSelf, players, bodies, sabotage, nearbyInteractable);
      }

      animFrameId = requestAnimationFrame(loop);
    };

    animFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameId);
  }, [self, players, bodies, sabotage, meeting, activeTask, activeSabotageFix, nearbyInteractable, nearbyBodyId]);

  const triggerInteract = (targetId: string) => {
    if (targetId === 'LIGHTS_BREAKER') {
      setActiveSabotageFix(true);
    } else {
      const task = self.tasks.find(t => t.id === targetId);
      if (task) {
        setActiveTask(task);
      }
    }
  };

  const handleUseInteract = () => {
    if (nearbyInteractable) {
      triggerInteract(nearbyInteractable);
    }
  };

  const handleKill = () => {
    const posX = localPosRef.current.x;
    const posY = localPosRef.current.y;

    const targets = players.filter(p => p.id !== self.id && p.state === 'ALIVE');
    const closest = targets.find(p => Math.sqrt(Math.pow(posX - p.x, 2) + Math.pow(posY - p.y, 2)) < 120);
    if (closest) {
      socket.emit(SOCKET_EVENTS.C2S_KILL, { targetId: closest.id });
    }
  };

  const handleReport = () => {
    if (nearbyBodyId) {
      socket.emit(SOCKET_EVENTS.C2S_REPORT_BODY, { bodyId: nearbyBodyId });
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
          canReport={nearbyBodyId !== null}
          onJoystickMove={(dir) => {
            if (inputHandlerRef.current) {
              inputHandlerRef.current.joystickDir = dir;
            }
          }}
          onUseInteract={handleUseInteract}
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
