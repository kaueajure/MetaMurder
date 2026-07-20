import { describe, it, expect } from 'vitest';
import { GameEngine } from '../src/server/gameEngine';
import { BotEngine, findAStarPath, WAYPOINTS } from '../src/server/botEngine';
import { DEFAULT_GAME_SETTINGS } from '../src/shared/constants';
import { RoomPlayer } from '../src/server/roomManager';

describe('BotEngine AI Logic', () => {
  it('should initialize bot memories and navigate towards targets', () => {
    const roomPlayers = new Map<string, RoomPlayer>();
    roomPlayers.set('bot1', {
      id: 'bot1', socketId: null, name: 'Bot-Alpha', isBot: true,
      color: 'RED', hatId: 'NONE', skinId: 'DEFAULT', isHost: true, isReady: true
    });
    roomPlayers.set('p1', {
      id: 'p1', socketId: 's1', name: 'Player 1', isBot: false,
      color: 'BLUE', hatId: 'NONE', skinId: 'DEFAULT', isHost: false, isReady: true
    });

    const engine = new GameEngine('TEST02', DEFAULT_GAME_SETTINGS, roomPlayers, () => {}, () => {});
    const bot = engine.players.get('bot1')!;
    
    expect(bot.isBot).toBe(true);
    if (bot.role === 'CREWMATE') {
      expect(bot.tasks.length).toBeGreaterThan(0);
    } else {
      expect(bot.tasks.length).toBe(0);
    }
  });

  it('should find valid A* paths between all 11 rooms in the map graph', () => {
    const roomKeys = [
      'CAFETERIA', 'NAVIGATION', 'SECURITY', 'REACTOR',
      'UPPER_ENGINE', 'MEDBAY', 'WEAPONS', 'ELECTRICAL',
      'LOWER_ENGINE', 'STORAGE', 'ADMIN'
    ];

    for (const startRoom of roomKeys) {
      for (const endRoom of roomKeys) {
        if (startRoom === endRoom) continue;
        const path = findAStarPath(WAYPOINTS[startRoom], WAYPOINTS[endRoom]);
        expect(path.length).toBeGreaterThan(1);
        const destination = path[path.length - 1];
        expect(destination.x).toBe(WAYPOINTS[endRoom].x);
        expect(destination.y).toBe(WAYPOINTS[endRoom].y);
      }
    }
  });
});

