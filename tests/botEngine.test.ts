import { afterEach, describe, it, expect, vi } from 'vitest';
import { GameEngine } from '../src/server/gameEngine';
import { BotEngine, findAStarPath, WAYPOINTS } from '../src/server/botEngine';
import { DEFAULT_GAME_SETTINGS } from '../src/shared/constants';
import { RoomPlayer } from '../src/server/roomManager';
import { BotAIProvider } from '../src/server/geminiBotAI';
import { ROOMS, SPAWN_POINTS, TASK_DEFINITIONS } from '../src/shared/mapData';

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

  it('should find valid paths between every room in the office graph', () => {
    const roomKeys = ROOMS.map(room => room.id);

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

  it('should physically navigate a collision-aware bot to every task station', () => {
    const offlineAI: BotAIProvider = {
      configured: false,
      createChat: async () => null,
      chooseVote: async () => null,
      chooseAction: async () => null
    };

    for (const definition of TASK_DEFINITIONS) {
      const roomPlayers = new Map<string, RoomPlayer>();
      roomPlayers.set('bot', {
        id: 'bot', socketId: null, name: 'Bot', isBot: true,
        color: 'RED', hatId: 'NONE', skinId: 'DEFAULT', isHost: true, isReady: true
      });
      roomPlayers.set('human', {
        id: 'human', socketId: 's1', name: 'Human', isBot: false,
        color: 'BLUE', hatId: 'NONE', skinId: 'DEFAULT', isHost: false, isReady: true
      });

      const engine = new GameEngine('PATH01', DEFAULT_GAME_SETTINGS, roomPlayers, () => {}, () => {}, offlineAI);
      const bot = engine.players.get('bot')!;
      bot.role = 'CREWMATE';
      bot.x = SPAWN_POINTS[0].x;
      bot.y = SPAWN_POINTS[0].y;
      bot.tasks = [{
        id: `assigned_${definition.id}`,
        definitionId: definition.id,
        type: definition.type,
        roomName: definition.roomName,
        x: definition.x,
        y: definition.y,
        completed: false
      }];

      const controller = new BotEngine(engine, offlineAI);
      controller.initBot(bot.id);
      for (let tick = 0; tick < 700 && !bot.tasks[0].completed; tick++) {
        controller.tick(bot, 1 / 20);
      }

      expect(bot.tasks[0].completed, `${definition.id} should be completed`).toBe(true);
    }
  });

  it('should use AI to answer when a human mentions the bot in meeting chat', async () => {
    vi.useFakeTimers();
    const ai: BotAIProvider = {
      configured: true,
      createChat: vi.fn().mockResolvedValue('Eu estava na elétrica, você viu alguma prova?'),
      chooseVote: vi.fn().mockResolvedValue('SKIP'),
      chooseAction: vi.fn().mockResolvedValue({ action: 'WAIT', target: '', sabotageType: 'NONE' })
    };

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

    const engine = new GameEngine('CHAT01', DEFAULT_GAME_SETTINGS, roomPlayers, () => {}, () => {}, ai);
    const human = engine.players.get('human')!;
    human.x = 1100;
    human.y = 650;
    engine.bodies.push({
      id: 'body_chat_test',
      victimId: 'victim',
      victimName: 'Victim',
      victimColor: 'WHITE',
      x: 1100,
      y: 650,
      reported: false
    });
    expect(engine.reportBody(human.id, 'body_chat_test')).toBe(true);

    engine.sendChatMessage(human.id, 'Acho que foi o Bot-Alpha');
    expect(engine.chatMessages.at(-1)?.senderId).toBe(human.id);

    await vi.advanceTimersByTimeAsync(1000);

    const botReplies = engine.chatMessages.filter(message => message.senderId === 'bot1');
    expect(botReplies).toHaveLength(1);
    expect(botReplies[0].text).toBe('Eu estava na elétrica, você viu alguma prova?');
    expect(ai.createChat).toHaveBeenCalledOnce();
  });
});
