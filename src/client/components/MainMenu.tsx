import React, { useState } from 'react';
import { RoomSummary, UserProfile } from '../../shared/types';
import { soundEngine } from '../audio/soundEffects';

interface Props {
  profile: UserProfile;
  publicRooms: RoomSummary[];
  onCreateRoom: (isPrivate: boolean) => void;
  onJoinRoom: (code: string) => void;
  onRefreshRooms: () => void;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
}

export const MainMenu: React.FC<Props> = ({
  profile,
  publicRooms,
  onCreateRoom,
  onJoinRoom,
  onRefreshRooms,
  onOpenProfile,
  onOpenSettings
}) => {
  const [joinCode, setJoinCode] = useState('');

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    soundEngine.playButtonClick();
    onJoinRoom(joinCode.trim());
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-6 relative overflow-hidden">
      {/* Background Cyber Grid effect */}
      <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />

      {/* Top Header */}
      <div className="flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500 border-2 border-white/20 shadow-lg shadow-cyan-500/50 flex items-center justify-center font-black text-xl">
            M
          </div>
          <h1 className="text-2xl font-black tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-indigo-400">
            METAMURDER
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => { soundEngine.playButtonClick(); onOpenProfile(); }}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-bold flex items-center gap-2"
          >
            👤 <span className="text-cyan-400">{profile.username}</span>
          </button>
          <button
            onClick={() => { soundEngine.playButtonClick(); onOpenSettings(); }}
            className="w-10 h-10 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-bold flex items-center justify-center"
          >
            ⚙️
          </button>
        </div>
      </div>

      {/* Main Center Hero Actions */}
      <div className="max-w-4xl mx-auto w-full my-auto z-10 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Quick Play & Create Room */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 backdrop-blur-md shadow-2xl flex flex-col justify-between">
            <div>
              <h2 className="text-3xl font-black mb-2 text-white">CRIAR PARTIDA</h2>
              <p className="text-xs text-slate-400 mb-6">Crie uma nova sala para jogar com amigos ou bots personalizáveis.</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => { soundEngine.playButtonClick(); onCreateRoom(false); }}
                className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 font-black text-lg rounded-2xl shadow-xl transition-all active:scale-98 border border-cyan-400/30"
              >
                CRIAR SALA PÚBLICA
              </button>
              <button
                onClick={() => { soundEngine.playButtonClick(); onCreateRoom(true); }}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 font-bold text-xs rounded-xl border border-slate-700 text-slate-300"
              >
                CRIAR SALA PRIVADA
              </button>
            </div>
          </div>

          {/* Join by Code */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 backdrop-blur-md shadow-2xl flex flex-col justify-between">
            <div>
              <h2 className="text-3xl font-black mb-2 text-white">ENTRAR COM CÓDIGO</h2>
              <p className="text-xs text-slate-400 mb-6">Insira o código único de 6 caracteres fornecido pelo líder da sala.</p>
            </div>

            <form onSubmit={handleJoinByCode} className="space-y-3">
              <input
                type="text"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                placeholder="EX: ABC123"
                maxLength={6}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-center text-2xl font-mono font-bold tracking-widest text-cyan-400 focus:outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 font-black text-lg rounded-2xl shadow-xl transition-all active:scale-98 border border-emerald-400/30"
              >
                ENTRAR NA SALA
              </button>
            </form>
          </div>
        </div>

        {/* Public Room Browser List */}
        <div className="mt-8 bg-slate-900/40 border border-slate-800 rounded-3xl p-6 backdrop-blur-md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-white">SALAS PÚBLICAS DISPONÍVEIS</h3>
            <button
              onClick={() => { soundEngine.playButtonClick(); onRefreshRooms(); }}
              className="text-xs text-cyan-400 hover:underline font-bold"
            >
              🔄 ATUALIZAR
            </button>
          </div>

          {publicRooms.length === 0 ? (
            <div className="text-center py-8 text-xs font-mono text-slate-500">
              Nenhuma sala pública disponível no momento. Crie uma nova sala acima!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-48 overflow-y-auto">
              {publicRooms.map(room => (
                <div key={room.code} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex justify-between items-center">
                  <div>
                    <div className="font-bold text-xs text-white">{room.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{room.playerCount}/{room.maxPlayers} Jogadores</div>
                  </div>
                  <button
                    onClick={() => { soundEngine.playButtonClick(); onJoinRoom(room.code); }}
                    className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl"
                  >
                    ENTRAR
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
