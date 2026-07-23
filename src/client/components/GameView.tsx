import React, { useRef, useEffect, useState } from 'react';
import { PlayerPrivateData, PlayerPublicData, DeadBody, SabotageState, MeetingState, ChatMessage, PlayerTask } from '../../shared/types';
import { Renderer } from '../game/Renderer';
import { InputHandler } from '../game/InputHandler';
import { HUD } from './HUD';
import { Minimap } from './Minimap';
import { MeetingOverlay } from './MeetingOverlay';
import { TaskOverlay } from './TaskOverlay';
import { SabotageOverlay } from './SabotageOverlay';
import { CameraOverlay } from './CameraOverlay';
import { VentTravelPanel } from './VentTravelPanel';
import { DeathOverlay } from './DeathOverlay';
import { CAMERA_CONSOLE, SABOTAGE_NODES, VENTS } from '../../shared/mapData';
import { clampGhostPosition, clampPosition, hasLineOfSight } from '../../shared/mapCollision';
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
  const localMotionRef = useRef<{
    vx: number;
    vy: number;
    facing: 'LEFT' | 'RIGHT';
  }>({ vx: 0, vy: 0, facing: self.facing });
  const isLocallyMovingRef = useRef(false);
  const interactPressedRef = useRef(false);
  const ventPressedRef = useRef(false);

  const [activeTask, setActiveTask] = useState<PlayerTask | null>(null);
  const [activeSabotageFix, setActiveSabotageFix] = useState<boolean>(false);
  const [activeCameras, setActiveCameras] = useState(false);
  const [deathSequenceId, setDeathSequenceId] = useState<string | null>(null);
  const [showMinimap, setShowMinimap] = useState<boolean>(false);
  const [nearbyInteractable, setNearbyInteractable] = useState<string | null>(null);
  const [nearbyBodyId, setNearbyBodyId] = useState<string | null>(null);
  const [nearbyVentId, setNearbyVentId] = useState<string | null>(null);
  const nearbyInteractableRef = useRef<string | null>(null);
  const nearbyBodyIdRef = useRef<string | null>(null);
  const nearbyVentIdRef = useRef<string | null>(null);
  const previousSelfStateRef = useRef(self.state);
  const latestGameStateRef = useRef({ self, players, bodies, sabotage, meeting });
  const latestUiStateRef = useRef({ activeTask, activeSabotageFix, activeCameras, deathSequenceId });
  latestGameStateRef.current = { self, players, bodies, sabotage, meeting };
  latestUiStateRef.current = { activeTask, activeSabotageFix, activeCameras, deathSequenceId };

  // Reconcile only meaningful server corrections. Normal updates arrive
  // behind client prediction and must not drag the local character backwards.
  useEffect(() => {
    const dx = self.x - localPosRef.current.x;
    const dy = self.y - localPosRef.current.y;
    const correctionDistance = Math.hypot(dx, dy);
    const correctionThreshold = isLocallyMovingRef.current ? 240 : 24;
    if (correctionDistance > correctionThreshold) {
      localPosRef.current = { x: self.x, y: self.y };
    }
  }, [self.x, self.y]);

  useEffect(() => {
    if (meeting) setActiveCameras(false);
  }, [meeting]);

  useEffect(() => {
    const previousState = previousSelfStateRef.current;
    const becameGhost =
      previousState === 'ALIVE' &&
      (self.state === 'DEAD' || self.state === 'GHOST');
    const ownBody = bodies.find(body => body.victimId === self.id);

    if (becameGhost && ownBody) {
      setActiveTask(null);
      setActiveSabotageFix(false);
      setActiveCameras(false);
      setShowMinimap(false);
      setDeathSequenceId(ownBody.id);
      isLocallyMovingRef.current = false;
      localMotionRef.current = {
        ...localMotionRef.current,
        vx: 0,
        vy: 0
      };
    }

    previousSelfStateRef.current = self.state;
  }, [bodies, self.id, self.state]);

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
      const {
        self: currentSelf,
        players: currentPlayers,
        bodies: currentBodies,
        sabotage: currentSabotage,
        meeting: currentMeeting
      } = latestGameStateRef.current;
      const {
        activeTask: currentTask,
        activeSabotageFix: currentSabotageFix,
        activeCameras: currentCameras,
        deathSequenceId: currentDeathSequence
      } = latestUiStateRef.current;
      const inputState = inputHandlerRef.current?.getInputState();

      if (
        inputState &&
        !currentMeeting &&
        !currentTask &&
        !currentSabotageFix &&
        !currentCameras &&
        !currentDeathSequence &&
        !currentSelf.inVent
      ) {
        const state = inputState;
        const isMoving = state.moveX !== 0 || state.moveY !== 0;
        
        if (isMoving) {
          const speed = 210; // Fluid walking speed
          const vx = state.moveX * speed;
          const vy = state.moveY * speed;
          const facing = state.moveX === 0
            ? localMotionRef.current.facing
            : state.moveX < 0 ? 'LEFT' : 'RIGHT';
          localMotionRef.current = { vx, vy, facing };
          isLocallyMovingRef.current = true;

          // Move local position smoothly at 60 FPS
          const requestedPosition = {
            x: localPosRef.current.x + vx * dt,
            y: localPosRef.current.y + vy * dt
          };
          localPosRef.current = currentSelf.state === 'ALIVE'
            ? clampPosition(localPosRef.current, requestedPosition)
            : clampGhostPosition(requestedPosition);

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
        } else {
          if (isLocallyMovingRef.current) {
            // Send the exact release position instead of waiting for another
            // server snapshot, reducing the correction needed after key-up.
            socket.emit(SOCKET_EVENTS.C2S_MOVE, {
              x: localPosRef.current.x,
              y: localPosRef.current.y,
              vx: 0,
              vy: 0,
              facing: localMotionRef.current.facing
            });
          }
          isLocallyMovingRef.current = false;
          localMotionRef.current = {
            ...localMotionRef.current,
            vx: 0,
            vy: 0
          };
        }

        // Calculate nearby interactable on EVERY FRAME
        const posX = localPosRef.current.x;
        const posY = localPosRef.current.y;

        let detectedInteractable: string | null = null;

        // Check Crewmate Tasks
        if (currentSelf.role === 'CREWMATE') {
          for (const t of currentSelf.tasks) {
            if (!t.completed) {
              const d = Math.sqrt(Math.pow(posX - t.x, 2) + Math.pow(posY - t.y, 2));
              if (d < 120 && hasLineOfSight({ x: posX, y: posY }, t)) {
                detectedInteractable = t.id;
                break;
              }
            }
          }
        }

        if (
          !detectedInteractable &&
          currentSelf.state === 'ALIVE' &&
          Math.hypot(posX - CAMERA_CONSOLE.x, posY - CAMERA_CONSOLE.y) < 105 &&
          hasLineOfSight({ x: posX, y: posY }, CAMERA_CONSOLE)
        ) {
          detectedInteractable = CAMERA_CONSOLE.id;
        }

        // Check Sabotage Nodes
        if (
          !detectedInteractable &&
          currentSelf.state === 'ALIVE' &&
          currentSabotage.activeType === 'LIGHTS'
        ) {
          const node = SABOTAGE_NODES.LIGHTS_BREAKER;
          if (Math.sqrt(Math.pow(posX - node.x, 2) + Math.pow(posY - node.y, 2)) < 120) {
            detectedInteractable = 'LIGHTS_BREAKER';
          }
        }

        let detectedVentId: string | null = null;
        if (currentSelf.role === 'IMPOSTOR' && currentSelf.state === 'ALIVE') {
          const nearestVent = VENTS
            .map(vent => ({
              vent,
              distance: Math.hypot(posX - vent.x, posY - vent.y)
            }))
            .filter(candidate =>
              candidate.distance <= 75 &&
              hasLineOfSight({ x: posX, y: posY }, candidate.vent)
            )
            .sort((a, b) => a.distance - b.distance)[0]?.vent;
          detectedVentId = nearestVent?.id ?? null;
          if (!detectedInteractable && detectedVentId) detectedInteractable = detectedVentId;
        }
        if (detectedVentId !== nearbyVentIdRef.current) {
          nearbyVentIdRef.current = detectedVentId;
          setNearbyVentId(detectedVentId);
        }

        if (detectedInteractable !== nearbyInteractableRef.current) {
          nearbyInteractableRef.current = detectedInteractable;
          setNearbyInteractable(detectedInteractable);
        }

        const closestBody = currentSelf.state === 'ALIVE' ? currentBodies
          .filter(body => !body.reported)
          .map(body => ({
            id: body.id,
            distance: Math.hypot(posX - body.x, posY - body.y)
          }))
          .filter(body => {
            const sourceBody = currentBodies.find(candidate => candidate.id === body.id)!;
            return body.distance <= 150 &&
              hasLineOfSight({ x: posX, y: posY }, sourceBody);
          })
          .sort((a, b) => a.distance - b.distance)[0] : undefined;
        const detectedBodyId = closestBody?.id ?? null;
        if (detectedBodyId !== nearbyBodyIdRef.current) {
          nearbyBodyIdRef.current = detectedBodyId;
          setNearbyBodyId(detectedBodyId);
        }

        // Auto trigger interaction if 'E' or Space pressed
        if (state.isInteracting && !interactPressedRef.current && detectedInteractable) {
          triggerInteract(detectedInteractable);
        }
      } else {
        isLocallyMovingRef.current = false;
        localMotionRef.current = {
          ...localMotionRef.current,
          vx: 0,
          vy: 0
        };
      }

      const controlsAvailable =
        !currentMeeting &&
        !currentTask &&
        !currentSabotageFix &&
        !currentCameras &&
        !currentDeathSequence;
      if (
        inputState?.isVentPressed &&
        !ventPressedRef.current &&
        controlsAvailable &&
        currentSelf.role === 'IMPOSTOR' &&
        currentSelf.state === 'ALIVE'
      ) {
        const ventId = currentSelf.currentVentId ?? nearbyVentIdRef.current;
        if (ventId) socket.emit(SOCKET_EVENTS.C2S_VENT, { ventId });
      }
      interactPressedRef.current = Boolean(inputState?.isInteracting);
      ventPressedRef.current = Boolean(inputState?.isVentPressed);

      // Render Scene
      if (rendererRef.current) {
        const predictedSelf = {
          ...currentSelf,
          x: localPosRef.current.x,
          y: localPosRef.current.y,
          ...localMotionRef.current
        };
        // The camera and local character must use the same 60 FPS prediction.
        // Remote players continue using authoritative server snapshots.
        const predictedPlayers = currentPlayers.map(player =>
          player.id === currentSelf.id
            ? {
                ...player,
                x: predictedSelf.x,
                y: predictedSelf.y,
                vx: predictedSelf.vx,
                vy: predictedSelf.vy,
                facing: predictedSelf.facing
              }
            : player
        );
        rendererRef.current.render(
          predictedSelf,
          predictedPlayers,
          currentBodies,
          currentSabotage,
          nearbyInteractableRef.current
        );
      }

      animFrameId = requestAnimationFrame(loop);
    };

    animFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameId);
  }, []);

  const triggerInteract = (targetId: string) => {
    if (targetId === 'LIGHTS_BREAKER') {
      setActiveSabotageFix(true);
    } else if (targetId === CAMERA_CONSOLE.id) {
      setActiveCameras(true);
    } else if (VENTS.some(vent => vent.id === targetId)) {
      socket.emit(SOCKET_EVENTS.C2S_VENT, { ventId: targetId });
    } else {
      const task = latestGameStateRef.current.self.tasks.find(t => t.id === targetId);
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

  const predictedSelf = {
    ...self,
    x: localPosRef.current.x,
    y: localPosRef.current.y,
    ...localMotionRef.current
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950">
      <canvas ref={canvasRef} className="absolute inset-0 block cursor-pointer" />

      {!meeting && !deathSequenceId && (
        <HUD
          self={predictedSelf}
          completedTasks={completedTaskCount}
          totalTasks={totalTaskCount}
          sabotage={sabotage}
          nearbyInteractable={nearbyInteractable}
          canReport={nearbyBodyId !== null}
          canVent={Boolean(nearbyVentId) || self.inVent}
          onJoystickMove={(dir) => {
            if (inputHandlerRef.current) {
              inputHandlerRef.current.joystickDir = dir;
            }
          }}
          onUseInteract={handleUseInteract}
          onKill={handleKill}
          onReport={handleReport}
          onSabotage={handleSabotage}
          onVent={() => {
            const ventId = self.currentVentId ?? nearbyVentId;
            if (ventId) socket.emit(SOCKET_EVENTS.C2S_VENT, { ventId });
          }}
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

      {activeCameras && (
        <CameraOverlay
          players={players}
          bodies={bodies}
          onClose={() => setActiveCameras(false)}
        />
      )}

      {self.inVent && self.currentVentId && (
        <VentTravelPanel
          currentVentId={self.currentVentId}
          onTravel={ventId => socket.emit(SOCKET_EVENTS.C2S_VENT, { ventId })}
          onExit={() => socket.emit(SOCKET_EVENTS.C2S_VENT, { ventId: self.currentVentId! })}
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

      {deathSequenceId && (
        <DeathOverlay
          key={deathSequenceId}
          player={self}
          onComplete={() => setDeathSequenceId(null)}
        />
      )}
    </div>
  );
};
