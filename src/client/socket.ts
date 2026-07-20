import { io, Socket } from 'socket.io-client';

const URL = process.env.NODE_ENV === 'production' ? window.location.origin : 'http://localhost:4000';

export const socket: Socket = io(URL, {
  autoConnect: true,
  reconnection: true
});
