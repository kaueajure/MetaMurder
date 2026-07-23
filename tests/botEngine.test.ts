import { afterEach, describe, it, expect, vi } from 'vitest';
import { GameEngine } from '../src/server/gameEngine';
import { BotEngine, findAStarPath, WAYPOINTS } from '../src/server/botEngine';
import { DEFAULT_GAME_SETTINGS } from '../src/shared/constants';
import { RoomPlayer } from '../src/server/roomManager';

describe('BotEngine AI Logic', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

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

  it('should answer defensively when a human mentions the bot in meeting chat', () => {
    vi.useFakeTimers();

    const roomPlayers = new Map<string, RoomPlayer>();
    roomPlayers.set('human', {
      id: 'human', socketId: 's1', name: 'Jogador', isBot: false,
      color: 'BLUE', hatId: 'NONE', skinId: 'DEFAULT', isHost: true, isReady: true
    });
    roomPlayers.set('bot1', {
      id: 'bot1', socketId: null, name: 'Bot-Alpha', isBot: true,
      color: 'RED', hatId: 'NONE', skinId: 'DEFAULT', isHost: false, isReady: true
    });
    roomPlayers.set('human2', {
      id: 'human2', socketId: 's2', name: 'Jogador 2', isBot: false,
      color: 'GREEN', hatId: 'NONE', skinId: 'DEFAULT', isHost: false, isReady: true
    });

    const engine = new GameEngine('CHAT01', DEFAULT_GAME_SETTINGS, roomPlayers, () => {}, () => {});
    const human = engine.players.get('human')!;
    human.x = 1100;
    human.y = 650;
    expect(engine.callEmergencyMeeting(human.id)).toBe(true);

    engine.sendChatMessage(human.id, 'Acho que foi o Bot-Alpha');
    expect(engine.chatMessages.at(-1)?.senderId).toBe(human.id);

    vi.advanceTimersByTime(1000);

    const botReplies = engine.chatMessages.filter(message => message.senderId === 'bot1');
    expect(botReplies).toHaveLength(1);
    expect(botReplies[0].text).toMatch(/inocente|não fui|não fiz|perder|prova|arrepender/i);
  });
});
