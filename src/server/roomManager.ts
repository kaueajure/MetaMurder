import { GameSettings, RoomSummary, PlayerPublicData, PlayerPrivateData } from '../shared/types';
import { DEFAULT_GAME_SETTINGS, PLAYER_COLORS, HATS, SKINS, BOT_NAMES } from '../shared/constants';
import { GameEngine } from './gameEngine';

export interface RoomPlayer {
  id: string;
  socketId: string | null;
  name: string;
  isBot: boolean;
  color: string;
  hatId: string;
  skinId: string;
  isHost: boolean;
  isReady: boolean;
  disconnectedAt?: number | null;
}

export class Room {
  public code: string;
  public name: string;
  public settings: GameSettings;
  public players: Map<string, RoomPlayer> = new Map();
  public gameEngine: GameEngine | null = null;
  public inGame: boolean = false;

  constructor(code: string, hostPlayer: RoomPlayer, isPrivate: boolean = false) {
    this.code = code;
    this.name = `Sala de ${hostPlayer.name}`;
    this.settings = { ...DEFAULT_GAME_SETTINGS, isPrivate };
    this.addPlayer(hostPlayer);
  }

  public addPlayer(player: RoomPlayer): boolean {
    if (this.players.size >= this.settings.maxPlayers && !this.players.has(player.id)) {
      return false;
    }

    // Ensure unique color assignment
    const usedColors = new Set(Array.from(this.players.values()).filter(p => p.id !== player.id).map(p => p.color));
    const availableColor = PLAYER_COLORS.find(c => !usedColors.has(c.id));
    if (usedColors.has(player.color) && availableColor) {
      player.color = availableColor.id;
    }

    this.players.set(player.id, player);
    return true;
  }

  public handleDisconnect(playerId: string): void {
    const player = this.players.get(playerId);
    if (!player) return;
    if (player.isBot) {
      this.removePlayer(playerId);
      return;
    }
    player.disconnectedAt = Date.now();
    player.socketId = null;
  }

  public handleReconnect(playerId: string, socketId: string): RoomPlayer | null {
    const player = this.players.get(playerId);
    if (!player) return null;
    player.disconnectedAt = null;
    player.socketId = socketId;
    if (this.gameEngine) {
      const gPlayer = this.gameEngine.players.get(playerId);
      if (gPlayer) {
        gPlayer.socketId = socketId;
      }
    }
    return player;
  }

  public removePlayer(playerId: string): void {
    const player = this.players.get(playerId);
    this.players.delete(playerId);

    if (player?.isHost && this.players.size > 0) {
      // Transfer host status to first non-bot player, or first bot if all are bots
      const remaining = Array.from(this.players.values());
      const newHost = remaining.find(p => !p.isBot) || remaining[0];
      if (newHost) {
        newHost.isHost = true;
      }
    }

    if (this.gameEngine) {
      this.gameEngine.handlePlayerDisconnect(playerId);
    }
  }

  public addBot(): RoomPlayer | null {
    if (this.players.size >= this.settings.maxPlayers) return null;

    const usedNames = new Set(Array.from(this.players.values()).map(p => p.name));
    const botName = BOT_NAMES.find(n => !usedNames.has(n)) || `Bot_${Math.floor(Math.random() * 1000)}`;

    const usedColors = new Set(Array.from(this.players.values()).map(p => p.color));
    const availableColor = PLAYER_COLORS.find(c => !usedColors.has(c.id)) || PLAYER_COLORS[0];

    const botPlayer: RoomPlayer = {
      id: `bot_${Math.random().toString(36).substr(2, 8)}`,
      socketId: null,
      name: botName,
      isBot: true,
      color: availableColor.id,
      hatId: HATS[Math.floor(Math.random() * HATS.length)].id,
      skinId: SKINS[Math.floor(Math.random() * SKINS.length)].id,
      isHost: false,
      isReady: true
    };

    this.players.set(botPlayer.id, botPlayer);
    return botPlayer;
  }

  public removeBot(): boolean {
    const bots = Array.from(this.players.values()).filter(p => p.isBot);
    if (bots.length === 0) return false;
    const lastBot = bots[bots.length - 1];
    this.removePlayer(lastBot.id);
    return true;
  }

  public getSummary(): RoomSummary {
    const host = Array.from(this.players.values()).find(p => p.isHost);
    return {
      code: this.code,
      name: this.name,
      hostName: host ? host.name : 'Ninguém',
      players: Array.from(this.players.values()).map(player => ({
        id: player.id,
        name: player.name,
        isBot: player.isBot,
        color: player.color,
        hatId: player.hatId,
        skinId: player.skinId,
        isHost: player.isHost,
        isReady: player.isReady
      })),
      playerCount: this.players.size,
      maxPlayers: this.settings.maxPlayers,
      impostorCount: this.settings.impostorCount,
      isPrivate: this.settings.isPrivate,
      inGame: this.inGame
    };
  }
}

export class RoomManager {
  private rooms: Map<string, Room> = new Map();

  public createRoom(hostPlayer: RoomPlayer, isPrivate: boolean = false): Room {
    let code = '';
    do {
      code = Math.random().toString(36).substring(2, 8).toUpperCase();
    } while (this.rooms.has(code));

    const room = new Room(code, hostPlayer, isPrivate);
    this.rooms.set(code, room);
    return room;
  }

  public getRoom(code: string): Room | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  public getPublicRooms(): RoomSummary[] {
    return Array.from(this.rooms.values())
      .filter(r => !r.settings.isPrivate && !r.inGame)
      .map(r => r.getSummary());
  }

  public deleteRoom(code: string): void {
    const room = this.rooms.get(code);
    if (room && room.gameEngine) {
      room.gameEngine.stop();
    }
    this.rooms.delete(code);
  }
}

export const roomManager = new RoomManager();
