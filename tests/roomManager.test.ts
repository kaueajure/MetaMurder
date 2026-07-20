import { describe, it, expect } from 'vitest';
import { RoomManager, RoomPlayer } from '../src/server/roomManager';

describe('RoomManager & Lobbies', () => {
  it('should create room and generate unique code', () => {
    const manager = new RoomManager();
    const host: RoomPlayer = {
      id: 'h1', socketId: 's1', name: 'Host', isBot: false,
      color: 'RED', hatId: 'NONE', skinId: 'DEFAULT', isHost: true, isReady: true
    };

    const room = manager.createRoom(host, false);
    expect(room.code).toBeDefined();
    expect(room.code.length).toBe(6);
    expect(manager.getRoom(room.code)).toBe(room);
  });

  it('should transfer host status when host leaves room', () => {
    const manager = new RoomManager();
    const host: RoomPlayer = {
      id: 'h1', socketId: 's1', name: 'Host', isBot: false,
      color: 'RED', hatId: 'NONE', skinId: 'DEFAULT', isHost: true, isReady: true
    };
    const guest: RoomPlayer = {
      id: 'g1', socketId: 's2', name: 'Guest', isBot: false,
      color: 'BLUE', hatId: 'NONE', skinId: 'DEFAULT', isHost: false, isReady: true
    };

    const room = manager.createRoom(host, false);
    room.addPlayer(guest);

    room.removePlayer('h1');
    const remainingGuest = room.players.get('g1');
    expect(remainingGuest?.isHost).toBe(true);
  });
});
