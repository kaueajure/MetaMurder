import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { initDb, getUserProfile } from './db';
import { router as apiRouter } from './routes';
import { roomManager, RoomPlayer } from './roomManager';
import { GameEngine } from './gameEngine';
import { SOCKET_EVENTS, C2SMovePayload } from '../shared/protocol';
import { GameSettings, PlayerCustomization, PlayerPublicData } from '../shared/types';


dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use('/api', apiRouter);

// Serve static frontend in production mode
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../client')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../client/index.html'));
  });
}

// Socket.IO real-time multiplayer connections
io.on('connection', (socket: Socket) => {
  let currentRoomCode: string | null = null;
  let userId: string | null = null;

  socket.on(SOCKET_EVENTS.C2S_AUTHENTICATE, async (data: { userId: string; name: string }) => {
    userId = data.userId;
  });

  socket.on(SOCKET_EVENTS.C2S_GET_ROOMS, () => {
    socket.emit(SOCKET_EVENTS.S2C_ROOM_LIST, roomManager.getPublicRooms());
  });

  socket.on(SOCKET_EVENTS.C2S_CREATE_ROOM, async (data: { isPrivate?: boolean; name?: string }) => {
    if (!userId) return;
    const profile = await getUserProfile(userId);

    const hostPlayer: RoomPlayer = {
      id: userId,
      socketId: socket.id,
      name: data.name || profile.username,
      isBot: false,
      color: profile.equippedColor,
      hatId: profile.equippedHat,
      skinId: profile.equippedSkin,
      isHost: true,
      isReady: true
    };

    const room = roomManager.createRoom(hostPlayer, data.isPrivate);
    currentRoomCode = room.code;

    socket.join(room.code);
    socket.emit(SOCKET_EVENTS.S2C_ROOM_JOINED, { roomCode: room.code, summary: room.getSummary() });
    io.to(room.code).emit(SOCKET_EVENTS.S2C_ROOM_UPDATED, room.getSummary());
  });

  socket.on(SOCKET_EVENTS.C2S_JOIN_ROOM, async (data: { roomCode: string; name?: string }) => {
    if (!userId) return;
    const room = roomManager.getRoom(data.roomCode);

    if (!room) {
      socket.emit(SOCKET_EVENTS.S2C_ERROR, { message: 'Sala não encontrada!' });
      return;
    }

    if (room.inGame) {
      socket.emit(SOCKET_EVENTS.S2C_ERROR, { message: 'A partida já está em andamento!' });
      return;
    }

    const profile = await getUserProfile(userId);
    const newPlayer: RoomPlayer = {
      id: userId,
      socketId: socket.id,
      name: data.name || profile.username,
      isBot: false,
      color: profile.equippedColor,
      hatId: profile.equippedHat,
      skinId: profile.equippedSkin,
      isHost: false,
      isReady: false
    };

    if (room.addPlayer(newPlayer)) {
      currentRoomCode = room.code;
      socket.join(room.code);
      socket.emit(SOCKET_EVENTS.S2C_ROOM_JOINED, { roomCode: room.code, summary: room.getSummary() });
      io.to(room.code).emit(SOCKET_EVENTS.S2C_ROOM_UPDATED, room.getSummary());
    } else {
      socket.emit(SOCKET_EVENTS.S2C_ERROR, { message: 'Sala lotada!' });
    }
  });

  socket.on(SOCKET_EVENTS.C2S_ADD_BOT, () => {
    if (!currentRoomCode) return;
    const room = roomManager.getRoom(currentRoomCode);
    if (room && !room.inGame) {
      room.addBot();
      io.to(room.code).emit(SOCKET_EVENTS.S2C_ROOM_UPDATED, room.getSummary());
    }
  });

  socket.on(SOCKET_EVENTS.C2S_REMOVE_BOT, () => {
    if (!currentRoomCode) return;
    const room = roomManager.getRoom(currentRoomCode);
    if (room && !room.inGame) {
      room.removeBot();
      io.to(room.code).emit(SOCKET_EVENTS.S2C_ROOM_UPDATED, room.getSummary());
    }
  });

  socket.on(SOCKET_EVENTS.C2S_UPDATE_SETTINGS, (settings: Partial<GameSettings>) => {
    if (!currentRoomCode) return;
    const room = roomManager.getRoom(currentRoomCode);
    if (room && !room.inGame) {
      room.settings = { ...room.settings, ...settings };
      io.to(room.code).emit(SOCKET_EVENTS.S2C_ROOM_UPDATED, room.getSummary());
    }
  });

  socket.on(SOCKET_EVENTS.C2S_UPDATE_CUSTOMIZATION, (custom: PlayerCustomization) => {
    if (!currentRoomCode || !userId) return;
    const room = roomManager.getRoom(currentRoomCode);
    if (room) {
      const player = room.players.get(userId);
      if (player) {
        player.color = custom.color;
        player.hatId = custom.hatId;
        player.skinId = custom.skinId;
        io.to(room.code).emit(SOCKET_EVENTS.S2C_ROOM_UPDATED, room.getSummary());
      }
    }
  });

  socket.on(SOCKET_EVENTS.C2S_START_GAME, () => {
    if (!currentRoomCode || !userId) return;
    const room = roomManager.getRoom(currentRoomCode);
    if (!room) return;

    const host = Array.from(room.players.values()).find(p => p.isHost);
    if (host?.id !== userId) return; // Only host can start

    // Auto add bots to fill if botCount > existing bots
    const currentBots = Array.from(room.players.values()).filter(p => p.isBot).length;
    for (let i = currentBots; i < room.settings.botCount; i++) {
      room.addBot();
    }

    room.inGame = true;

    // Create & start game engine
    room.gameEngine = new GameEngine(
      room.code,
      room.settings,
      room.players,
      () => broadcastGameState(room),
      (winner, reason) => {
        io.to(room.code).emit(SOCKET_EVENTS.S2C_GAME_OVER, {
          winner,
          reason,
          impostorIds: Array.from(room.gameEngine!.players.values())
            .filter(p => p.role === 'IMPOSTOR')
            .map(p => p.id)
        });
        room.inGame = false;
      }
    );

    room.gameEngine.start();
    io.to(room.code).emit(SOCKET_EVENTS.S2C_GAME_STARTED);
  });

  // --- Real-time Game Commands ---

  socket.on(SOCKET_EVENTS.C2S_MOVE, (data: C2SMovePayload) => {
    if (!currentRoomCode || !userId) return;
    const room = roomManager.getRoom(currentRoomCode);
    if (room?.gameEngine) {
      room.gameEngine.handlePlayerMove(userId, data.x, data.y, data.vx, data.vy, data.facing);
    }
  });

  socket.on(SOCKET_EVENTS.C2S_KILL, (data: { targetId: string }) => {
    if (!currentRoomCode || !userId) return;
    const room = roomManager.getRoom(currentRoomCode);
    if (room?.gameEngine) {
      room.gameEngine.killPlayer(userId, data.targetId);
    }
  });

  socket.on(SOCKET_EVENTS.C2S_REPORT_BODY, (data: { bodyId: string }) => {
    if (!currentRoomCode || !userId) return;
    const room = roomManager.getRoom(currentRoomCode);
    if (room?.gameEngine) {
      room.gameEngine.reportBody(userId, data.bodyId);
    }
  });

  socket.on(SOCKET_EVENTS.C2S_CALL_MEETING, () => {
    if (!currentRoomCode || !userId) return;
    const room = roomManager.getRoom(currentRoomCode);
    if (room?.gameEngine) {
      room.gameEngine.callEmergencyMeeting(userId);
    }
  });

  socket.on(SOCKET_EVENTS.C2S_CAST_VOTE, (data: { targetId: string }) => {
    if (!currentRoomCode || !userId) return;
    const room = roomManager.getRoom(currentRoomCode);
    if (room?.gameEngine) {
      room.gameEngine.castVote(userId, data.targetId);
    }
  });

  socket.on(SOCKET_EVENTS.C2S_COMPLETE_TASK, (data: { taskId: string }) => {
    if (!currentRoomCode || !userId) return;
    const room = roomManager.getRoom(currentRoomCode);
    if (room?.gameEngine) {
      room.gameEngine.completeTask(userId, data.taskId);
    }
  });

  socket.on(SOCKET_EVENTS.C2S_TRIGGER_SABOTAGE, (data: { type: any }) => {
    if (!currentRoomCode || !userId) return;
    const room = roomManager.getRoom(currentRoomCode);
    if (room?.gameEngine) {
      room.gameEngine.triggerSabotage(userId, data.type);
    }
  });

  socket.on(SOCKET_EVENTS.C2S_RESOLVE_SABOTAGE_NODE, (data: { nodeId: string }) => {
    if (!currentRoomCode || !userId) return;
    const room = roomManager.getRoom(currentRoomCode);
    if (room?.gameEngine) {
      room.gameEngine.resolveSabotageNode(userId, data.nodeId);
    }
  });

  socket.on(SOCKET_EVENTS.C2S_VENT, (data: { ventId: string }) => {
    if (!currentRoomCode || !userId) return;
    const room = roomManager.getRoom(currentRoomCode);
    if (room?.gameEngine) {
      room.gameEngine.useVent(userId, data.ventId);
    }
  });

  socket.on(SOCKET_EVENTS.C2S_SEND_CHAT, (data: { text: string }) => {
    if (!currentRoomCode || !userId) return;
    const room = roomManager.getRoom(currentRoomCode);
    if (room?.gameEngine) {
      room.gameEngine.sendChatMessage(userId, data.text);
    }
  });

  socket.on('disconnect', () => {
    if (currentRoomCode && userId) {
      const room = roomManager.getRoom(currentRoomCode);
      if (room) {
        room.removePlayer(userId);
        if (room.players.size === 0) {
          roomManager.deleteRoom(currentRoomCode);
        } else {
          io.to(room.code).emit(SOCKET_EVENTS.S2C_ROOM_UPDATED, room.getSummary());
        }
      }
    }
  });
});

function broadcastGameState(room: any): void {
  if (!room.gameEngine) return;
  const engine: GameEngine = room.gameEngine;

  const totalTasks = Array.from(engine.players.values())
    .filter(p => p.role === 'CREWMATE')
    .reduce((sum, p) => sum + p.tasks.length, 0);

  const completedTasks = Array.from(engine.players.values())
    .filter(p => p.role === 'CREWMATE')
    .reduce((sum, p) => sum + p.tasks.filter(t => t.completed).length, 0);

  // Send state update tailored for each connected client (filtering hidden private roles)
  engine.players.forEach(p => {
    if (!p.isBot && p.socketId) {
      const socket = io.sockets.sockets.get(p.socketId);
      if (socket) {
        const publicPlayers: PlayerPublicData[] = Array.from(engine.players.values()).map(other => ({
          id: other.id,
          name: other.name,
          isBot: other.isBot,
          color: other.color,
          hatId: other.hatId,
          skinId: other.skinId,
          x: other.x,
          y: other.y,
          vx: other.vx,
          vy: other.vy,
          facing: other.facing,
          state: other.state,
          isReady: other.isReady,
          isHost: other.isHost,
          inVent: other.inVent,
          currentVentId: other.currentVentId
        }));

        socket.emit(SOCKET_EVENTS.S2C_GAME_STATE, {
          phase: engine.phase,
          players: publicPlayers,
          self: p,
          bodies: engine.bodies,
          sabotage: engine.sabotage,
          meeting: engine.meetingState,
          chat: engine.chatMessages,
          totalTaskCount: totalTasks,
          completedTaskCount: completedTasks
        });
      }
    }
  });
}

// Start HTTP server
initDb().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`🚀 MetaMurder Server running on port ${PORT}`);
  });
}).catch(console.error);
