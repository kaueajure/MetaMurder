import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine, GamePlayer } from '../src/server/gameEngine';
import { DEFAULT_GAME_SETTINGS } from '../src/shared/constants';
import { RoomPlayer } from '../src/server/roomManager';

describe('GameEngine Rules', () => {
  let roomPlayers: Map<string, RoomPlayer>;

  beforeEach(() => {
    roomPlayers = new Map();
    roomPlayers.set('p1', {
      id: 'p1', socketId: 's1', name: 'Player 1', isBot: false,
      color: 'RED', hatId: 'NONE', skinId: 'DEFAULT', isHost: true, isReady: true
    });
    roomPlayers.set('p2', {
      id: 'p2', socketId: 's2', name: 'Player 2', isBot: false,
      color: 'BLUE', hatId: 'NONE', skinId: 'DEFAULT', isHost: false, isReady: true
    });
    roomPlayers.set('p3', {
      id: 'p3', socketId: 's3', name: 'Player 3', isBot: false,
      color: 'GREEN', hatId: 'NONE', skinId: 'DEFAULT', isHost: false, isReady: true
    });
  });

  it('should assign roles correctly to players upon initialization', () => {
    const engine = new GameEngine('TEST01', { ...DEFAULT_GAME_SETTINGS, impostorCount: 1 }, roomPlayers, () => {}, () => {});
    const players = Array.from(engine.players.values());
    
    expect(players.length).toBe(3);
    const impostors = players.filter(p => p.role === 'IMPOSTOR');
    const crewmates = players.filter(p => p.role === 'CREWMATE');

    expect(impostors.length).toBe(1);
    expect(crewmates.length).toBe(2);
  });

  it('should validate kill distance and cooldowns', () => {
    const engine = new GameEngine('TEST01', { ...DEFAULT_GAME_SETTINGS, killCooldown: 20 }, roomPlayers, () => {}, () => {});
    const players = Array.from(engine.players.values());
    const imp = players.find(p => p.role === 'IMPOSTOR')!;
    const crew = players.find(p => p.role === 'CREWMATE')!;

    // Set cooldown to 0 for test
    imp.killCooldownRemaining = 0;
    imp.x = 100; imp.y = 100;
    crew.x = 100; crew.y = 120; // 20px distance (within medium range)

    const killSuccess = engine.killPlayer(imp.id, crew.id);
    expect(killSuccess).toBe(true);
    expect(crew.state).toBe('DEAD');
    expect(engine.bodies.length).toBe(1);
  });

  it('should tally votes and eject most voted player during meeting', () => {
    const engine = new GameEngine('TEST01', DEFAULT_GAME_SETTINGS, roomPlayers, () => {}, () => {});
    const p1 = engine.players.get('p1')!;
    const p2 = engine.players.get('p2')!;
    const p3 = engine.players.get('p3')!;

    // Initiate a meeting by reporting a nearby body
    p1.x = 1100; p1.y = 650;
    engine.bodies.push({
      id: 'body_vote_test',
      victimId: 'victim',
      victimName: 'Victim',
      victimColor: 'WHITE',
      x: 1100,
      y: 650,
      reported: false
    });
    engine.reportBody('p1', 'body_vote_test');
    expect(engine.phase).toBe('MEETING');

    // Cast votes
    engine.castVote('p1', 'p2');
    engine.castVote('p3', 'p2');
    engine.castVote('p2', 'p1'); // p2 voted 2 times -> ejected

    expect(engine.meetingState?.ejectedPlayerId).toBe('p2');
    expect(p2.state).toBe('DEAD');
  });

  it('should only complete a crewmate task while the player is at its station', () => {
    const engine = new GameEngine('TASK01', DEFAULT_GAME_SETTINGS, roomPlayers, () => {}, () => {});
    const crewmate = Array.from(engine.players.values()).find(player => player.role === 'CREWMATE')!;
    const task = crewmate.tasks[0];

    crewmate.x = 2300;
    crewmate.y = 1500;
    expect(engine.completeTask(crewmate.id, task.id)).toBe(false);
    expect(task.completed).toBe(false);

    crewmate.x = task.x;
    crewmate.y = task.y;
    expect(engine.completeTask(crewmate.id, task.id)).toBe(true);
    expect(task.completed).toBe(true);
  });

  it('should reject reporting a body that was not found nearby', () => {
    const engine = new GameEngine('REPORT01', DEFAULT_GAME_SETTINGS, roomPlayers, () => {}, () => {});
    const reporter = engine.players.get('p1')!;
    reporter.x = 1100;
    reporter.y = 650;
    engine.bodies.push({
      id: 'far_body',
      victimId: 'victim',
      victimName: 'Victim',
      victimColor: 'WHITE',
      x: 200,
      y: 200,
      reported: false
    });

    expect(engine.reportBody(reporter.id, 'far_body')).toBe(false);
    expect(engine.phase).toBe('PLAYING');
  });
});
