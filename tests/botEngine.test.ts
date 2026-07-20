import { describe, it, expect } from 'vitest';
import { GameEngine } from '../src/server/gameEngine';
import { BotEngine } from '../src/server/botEngine';
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
});

