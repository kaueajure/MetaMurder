import React, { useState, useEffect } from 'react';
import { socket } from '../socket';
import { SOCKET_EVENTS, S2CGameStatePayload, S2CGameOverPayload } from '../../shared/protocol';
import { UserProfile, RoomSummary, PlayerPrivateData, PlayerPublicData, DeadBody, SabotageState, MeetingState, ChatMessage, GamePhase } from '../../shared/types';
import { MainMenu } from './MainMenu';
import { LobbyView } from './LobbyView';
import { GameView } from './GameView';
import { VictoryOverlay } from './VictoryOverlay';
import { CustomizeView } from './CustomizeView';
import { ProfileView } from './ProfileView';
import { SettingsView } from './SettingsView';

export const App: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [publicRooms, setPublicRooms] = useState<RoomSummary[]>([]);
  const [currentRoom, setCurrentRoom] = useState<RoomSummary | null>(null);
  
  // Game State
  const [inGame, setInGame] = useState<boolean>(false);
  const [gameState, setGameState] = useState<S2CGameStatePayload | null>(null);
  const [gameOver, setGameOver] = useState<S2CGameOverPayload | null>(null);
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);

  // Modals
  const [showCustomize, setShowCustomize] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Guest Auth on startup
  useEffect(() => {
    fetch('/api/auth/guest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guestId: localStorage.getItem('mm_guest_id') || undefined })
    })
      .then(res => res.json())
      .then(data => {
        if (data.profile) {
          setProfile(data.profile);
          localStorage.setItem('mm_guest_id', data.profile.id);
          socket.emit(SOCKET_EVENTS.C2S_AUTHENTICATE, { userId: data.profile.id, name: data.profile.username });
          
          // Auto reconnect if room code exists in session
          const savedRoom = sessionStorage.getItem('mm_room_code');
          if (savedRoom) {
            socket.emit(SOCKET_EVENTS.C2S_RECONNECT, { userId: data.profile.id, roomCode: savedRoom });
          } else {
            socket.emit(SOCKET_EVENTS.C2S_GET_ROOMS);
          }
        }
      })
      .catch(console.error);
  }, []);

  // Socket Event Listeners
  useEffect(() => {
    const handleConnect = () => {
      setIsReconnecting(false);
      const savedRoom = sessionStorage.getItem('mm_room_code');
      const savedUser = localStorage.getItem('mm_guest_id');
      if (savedRoom && savedUser) {
        socket.emit(SOCKET_EVENTS.C2S_RECONNECT, { userId: savedUser, roomCode: savedRoom });
      }
    };

    const handleDisconnect = () => {
      setIsReconnecting(true);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    socket.on(SOCKET_EVENTS.S2C_ROOM_LIST, (rooms: RoomSummary[]) => {
      setPublicRooms(rooms);
    });

    socket.on(SOCKET_EVENTS.S2C_ROOM_JOINED, (data: { roomCode: string; summary: RoomSummary }) => {
      setCurrentRoom(data.summary);
      sessionStorage.setItem('mm_room_code', data.roomCode);
      setGameOver(null);
    });

    socket.on(SOCKET_EVENTS.S2C_RECONNECTED, (data: { roomCode: string; summary: RoomSummary; inGame: boolean }) => {
      setCurrentRoom(data.summary);
      setInGame(data.inGame);
      setIsReconnecting(false);
    });

    socket.on(SOCKET_EVENTS.S2C_ROOM_UPDATED, (summary: RoomSummary) => {
      setCurrentRoom(summary);
    });

    socket.on(SOCKET_EVENTS.S2C_GAME_STARTED, () => {
      setInGame(true);
      setGameOver(null);
    });

    socket.on(SOCKET_EVENTS.S2C_GAME_STATE, (state: S2CGameStatePayload) => {
      setGameState(state);
    });

    socket.on(SOCKET_EVENTS.S2C_GAME_OVER, (payload: S2CGameOverPayload) => {
      setGameOver(payload);
    });

    socket.on(SOCKET_EVENTS.S2C_ERROR, (err: { message: string }) => {
      alert(err.message);
    });

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off(SOCKET_EVENTS.S2C_ROOM_LIST);
      socket.off(SOCKET_EVENTS.S2C_ROOM_JOINED);
      socket.off(SOCKET_EVENTS.S2C_RECONNECTED);
      socket.off(SOCKET_EVENTS.S2C_ROOM_UPDATED);
      socket.off(SOCKET_EVENTS.S2C_GAME_STARTED);
      socket.off(SOCKET_EVENTS.S2C_GAME_STATE);
      socket.off(SOCKET_EVENTS.S2C_GAME_OVER);
      socket.off(SOCKET_EVENTS.S2C_ERROR);
    };
  }, []);

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-cyan-400 font-mono text-lg animate-pulse">
        Carregando MetaMurder...
      </div>
    );
  }

  // Render Game View
  if (inGame && gameState) {
    return (
      <>
        {isReconnecting && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-amber-950/90 border border-amber-600/80 text-amber-300 px-4 py-2 rounded-xl text-xs font-mono font-bold shadow-2xl z-[100] flex items-center gap-2 animate-pulse">
            <span>⚠️</span> Reconectando ao servidor...
          </div>
        )}
        <GameView
          self={gameState.self}
          players={gameState.players}
          bodies={gameState.bodies}
          sabotage={gameState.sabotage}
          meeting={gameState.meeting || null}
          chatMessages={gameState.chat || []}
          totalTaskCount={gameState.totalTaskCount}
          completedTaskCount={gameState.completedTaskCount}
        />

        {gameOver && (
          <VictoryOverlay
            winner={gameOver.winner}
            reason={gameOver.reason}
            impostorIds={gameOver.impostorIds}
            selfRole={gameState.self.role}
            onReturnToLobby={() => {
              setInGame(false);
              setGameState(null);
              setGameOver(null);
            }}
          />
        )}
      </>
    );
  }

  // Render Lobby View
  if (currentRoom) {
    return (
      <>
        <LobbyView
          summary={currentRoom}
          isHost={currentRoom.hostName === profile.username}
          onStartGame={() => socket.emit(SOCKET_EVENTS.C2S_START_GAME)}
          onLeaveRoom={() => {
            socket.emit(SOCKET_EVENTS.C2S_LEAVE_ROOM);
            setCurrentRoom(null);
          }}
          onAddBot={() => socket.emit(SOCKET_EVENTS.C2S_ADD_BOT)}
          onRemoveBot={() => socket.emit(SOCKET_EVENTS.C2S_REMOVE_BOT)}
          onUpdateSettings={(settings) => socket.emit(SOCKET_EVENTS.C2S_UPDATE_SETTINGS, settings)}
          onOpenCustomize={() => setShowCustomize(true)}
        />

        {showCustomize && (
          <CustomizeView
            initial={{ color: profile.equippedColor, hatId: profile.equippedHat, skinId: profile.equippedSkin }}
            onSave={async (custom) => {
              const response = await fetch('/api/profile/customize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId: profile.id,
                  color: custom.color,
                  hatId: custom.hatId,
                  skinId: custom.skinId
                })
              });
              if (!response.ok) throw new Error('Customization save failed');
              socket.emit(SOCKET_EVENTS.C2S_UPDATE_CUSTOMIZATION, custom);
              setProfile({
                ...profile,
                equippedColor: custom.color,
                equippedHat: custom.hatId,
                equippedSkin: custom.skinId
              });
            }}
            onClose={() => setShowCustomize(false)}
          />
        )}
      </>
    );
  }

  // Render Main Menu View
  return (
    <>
      <MainMenu
        profile={profile}
        publicRooms={publicRooms}
        onCreateRoom={(isPrivate) => socket.emit(SOCKET_EVENTS.C2S_CREATE_ROOM, { isPrivate })}
        onJoinRoom={(roomCode) => socket.emit(SOCKET_EVENTS.C2S_JOIN_ROOM, { roomCode })}
        onRefreshRooms={() => socket.emit(SOCKET_EVENTS.C2S_GET_ROOMS)}
        onOpenProfile={() => setShowProfile(true)}
        onOpenSettings={() => setShowSettings(true)}
      />

      {showProfile && <ProfileView profile={profile} onClose={() => setShowProfile(false)} />}
      {showSettings && <SettingsView onClose={() => setShowSettings(false)} />}
    </>
  );
};
