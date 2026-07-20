import React, { useRef, useEffect, useState } from 'react';
import { PlayerPrivateData, PlayerPublicData, DeadBody, SabotageState, MeetingState, ChatMessage } from '../../shared/types';
import { Renderer } from '../game/Renderer';
import { InputHandler } from '../game/InputHandler';
import { Interpolator } from '../game/Interpolator';
import { HUD } from './HUD';
import { Minimap } from './Minimap';
import { MeetingOverlay } from './MeetingOverlay';
import { TaskOverlay } from './TaskOverlay';
import { SabotageOverlay } from './SabotageOverlay';
import { TASK_DEFINITIONS, EMERGENCY_BUTTON_POS, VENTS, SABOTAGE_NODES } from '../../shared/mapData';
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
  const interpolatorRef = useRef<Interpolator>(new Interpolator());

  const [activeTask, setActiveTask] = useState<any | null>(null);
  const [activeSabotageFix, setActiveSabotageFix] = useState<boolean>(false);
  const [showMinimap, setShowMinimap] = useState<boolean>(false);
  const [nearbyInteractable, setNearbyInteractable] = useState<string | null>(null);

  // Initialize Canvas & Input Handler
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

  // Check nearby interactables (Tasks, Emergency Button, Vents, Sabotage Nodes)
  useEffect(() => {
    if (self.state !== 'ALIVE') return;

    // Check emergency button
    const distButton = Math.sqrt(Math.pow(self.x - EMERGENCY_BUTTON_POS.x, 2) + Math.pow(self.y - EMERGENCY_BUTTON_POS.y, 2));
    if (distButton < 80) {
      setNearbyInteractable('EMERGENCY_BUTTON');
      return;
    }

    // Check tasks for crewmate
    if (self.role === 'CREWMATE') {
      for (const t of self.tasks) {
        if (!t.completed) {
          const d = Math.sqrt(Math.pow(self.x - t.x, 2) + Math.pow(self.y - t.y, 2));
          if (d < 80) {
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
        if (Math.sqrt(Math.pow(self.x - node.x, 2) + Math.pow(self.y - node.y, 2)) < 80) {
          setNearbyInteractable('LIGHTS_BREAKER');
          return;
        }
      }
    }

    setNearbyInteractable(null);
  }, [self.x, self.y, self.tasks, self.role, self.state, sabotage]);

  // Main Render & Input loop
  useEffect(() => {
    let animFrameId: number;

    const loop = () => {
      if (inputHandlerRef.current && self.state === 'ALIVE' && !meeting && !activeTask && !activeSabotageFix) {
        const state = inputHandlerRef.current.getInputState();
        if (state.moveX !== 0 || state.moveY !== 0) {
          const speed = 180 * 1.0;
          const vx = state.moveX * speed;
          const vy = state.moveY * speed;
          const facing = state.moveX < 0 ? 'LEFT' : 'RIGHT';

          socket.emit(SOCKET_EVENTS.C2S_MOVE, {
            x: self.x + vx * 0.016,
            y: self.y + vy * 0.016,
            vx,
            vy,
            facing
          });
        }
      }

      if (rendererRef.current) {
        rendererRef.current.render(self, players, bodies, sabotage, nearbyInteractable);
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
    // Find closest target
    const targets = players.filter(p => p.id !== self.id && p.state === 'ALIVE');
    if (targets.length > 0) {
      socket.emit(SOCKET_EVENTS.C2S_KILL, { targetId: targets[0].id });
    }
  };

  const handleReport = () => {
    if (bodies.length > 0) {
      socket.emit(SOCKET_EVENTS.C2S_REPORT_BODY, { bodyId: bodies[0].id });
    }
  };

  const handleSabotage = () => {
    socket.emit(SOCKET_EVENTS.C2S_TRIGGER_SABOTAGE, { type: 'LIGHTS' });
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950">
      <canvas ref={canvasRef} className="absolute inset-0 block" />

      {/* Main HUD */}
      {!meeting && (
        <HUD
          self={self}
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

      {/* Overlays */}
      {showMinimap && <Minimap self={self} onClose={() => setShowMinimap(false)} />}

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
