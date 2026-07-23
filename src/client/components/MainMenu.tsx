import React, { useState } from 'react';
import { RoomSummary, UserProfile } from '../../shared/types';
import { soundEngine } from '../audio/soundEffects';
import { CharacterPreview } from './CharacterPreview';
import stationDeck from '../assets/station-command-deck.webp';

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

  const handleJoinByCode = (event: React.FormEvent) => {
    event.preventDefault();
    if (!joinCode.trim()) return;
    soundEngine.playButtonClick();
    onJoinRoom(joinCode.trim());
  };

  return (
    <main className="relative min-h-screen overflow-y-auto bg-[#02050b] text-white">
      <div
        className="fixed inset-0 bg-cover bg-center scale-[1.02]"
        style={{ backgroundImage: `url(${stationDeck})` }}
      />
      <div className="fixed inset-0 bg-[linear-gradient(90deg,rgba(2,5,11,.94)_0%,rgba(2,5,11,.58)_48%,rgba(2,5,11,.78)_100%)]" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_36%,transparent_0%,rgba(2,5,11,.28)_52%,rgba(2,5,11,.86)_100%)]" />

      <div className="relative z-10 min-h-screen flex flex-col px-4 md:px-8 lg:px-12">
        <header className="h-20 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="relative w-11 h-11 rounded-full border border-cyan-200/40 bg-cyan-400/10 shadow-[0_0_30px_rgba(34,211,238,.25)] flex items-center justify-center">
              <span className="absolute inset-1 rounded-full border border-cyan-300/20" />
              <span className="font-black text-cyan-200">M</span>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-[.42em] text-cyan-200/55 font-bold">Orbital station zero</p>
              <h1 className="text-xl font-black tracking-[.12em] text-white">METAMURDER</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => { soundEngine.playButtonClick(); onOpenProfile(); }}
              className="h-10 px-4 rounded-full border border-white/10 bg-black/30 backdrop-blur-md text-xs font-bold hover:bg-white/10 transition-colors"
            >
              <span className="text-slate-400 mr-2">TRIPULANTE</span>
              <span className="text-cyan-200">{profile.username}</span>
            </button>
            <button
              onClick={() => { soundEngine.playButtonClick(); onOpenSettings(); }}
              aria-label="Configurações"
              className="w-10 h-10 rounded-full border border-white/10 bg-black/30 backdrop-blur-md hover:bg-white/10 transition-colors"
            >
              ⚙
            </button>
          </div>
        </header>

        <section className="flex-1 w-full max-w-7xl mx-auto grid lg:grid-cols-[.8fr_1.2fr] items-center gap-4 lg:gap-14 py-7">
          <div className="relative min-h-[360px] lg:min-h-[620px] hidden md:block">
            <div className="absolute left-1/2 -translate-x-1/2 bottom-[8%] w-[65%] h-[15%] rounded-[50%] border border-cyan-200/20 bg-cyan-300/5 [transform:translateX(-50%)_perspective(500px)_rotateX(66deg)] shadow-[0_0_50px_rgba(34,211,238,.15)]" />
            <div className="absolute inset-0">
              <CharacterPreview
                customization={{
                  color: profile.equippedColor,
                  hatId: profile.equippedHat,
                  skinId: profile.equippedSkin
                }}
              />
            </div>
            <div className="absolute left-3 bottom-8 max-w-xs">
              <p className="text-[10px] uppercase tracking-[.35em] text-amber-300/70 font-bold">Sinal desconhecido detectado</p>
              <h2 className="mt-2 text-4xl lg:text-5xl font-black leading-[.92] tracking-tight">
                DESCUBRA<br /><span className="text-cyan-200">QUEM ESTÁ</span><br />MENTINDO.
              </h2>
            </div>
          </div>

          <div className="space-y-4">
            <div className="md:hidden mb-6">
              <p className="text-[10px] uppercase tracking-[.35em] text-amber-300/70 font-bold">Sinal desconhecido detectado</p>
              <h2 className="mt-2 text-4xl font-black leading-none">DESCUBRA QUEM ESTÁ <span className="text-cyan-200">MENTINDO.</span></h2>
            </div>

            <div className="relative overflow-hidden border-y border-white/10 bg-black/35 backdrop-blur-xl">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-300 shadow-[0_0_18px_#22d3ee]" />
              <div className="p-6 md:p-8">
                <div className="flex items-center justify-between gap-4 mb-6">
                  <div>
                    <p className="text-[9px] uppercase tracking-[.35em] text-cyan-200/60 font-bold">Terminal de lançamento</p>
                    <h3 className="text-2xl font-black">Iniciar operação</h3>
                  </div>
                  <span className="text-[10px] text-emerald-300 font-mono flex items-center gap-2">
                    <i className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                    SERVIDOR ONLINE
                  </span>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => { soundEngine.playButtonClick(); onCreateRoom(false); }}
                    className="group relative min-h-28 p-5 text-left overflow-hidden border border-cyan-200/30 bg-cyan-400/10 hover:bg-cyan-300/20 transition-all"
                  >
                    <span className="absolute right-3 top-2 text-5xl text-cyan-200/10 group-hover:text-cyan-200/20 transition-colors">01</span>
                    <span className="block text-[10px] text-cyan-200 uppercase tracking-widest">Partida aberta</span>
                    <strong className="block mt-5 text-lg">CRIAR SALA PÚBLICA →</strong>
                  </button>
                  <button
                    onClick={() => { soundEngine.playButtonClick(); onCreateRoom(true); }}
                    className="group relative min-h-28 p-5 text-left overflow-hidden border border-white/10 bg-white/[.035] hover:bg-white/[.08] transition-all"
                  >
                    <span className="absolute right-3 top-2 text-5xl text-white/5 group-hover:text-white/10">02</span>
                    <span className="block text-[10px] text-slate-400 uppercase tracking-widest">Somente convidados</span>
                    <strong className="block mt-5 text-lg">CRIAR SALA PRIVADA →</strong>
                  </button>
                </div>
              </div>
            </div>

            <form onSubmit={handleJoinByCode} className="flex border-y border-white/10 bg-black/35 backdrop-blur-xl">
              <div className="flex-1 p-4 md:p-5">
                <label className="block text-[9px] uppercase tracking-[.3em] text-slate-500 font-bold mb-2">Código de acesso</label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={event => setJoinCode(event.target.value.toUpperCase())}
                  placeholder="ABC123"
                  maxLength={6}
                  className="w-full bg-transparent outline-none font-mono text-2xl tracking-[.35em] text-white placeholder:text-white/15"
                />
              </div>
              <button
                type="submit"
                className="px-6 md:px-10 bg-amber-400 text-slate-950 font-black hover:bg-amber-300 transition-colors"
              >
                ENTRAR
              </button>
            </form>

            <div className="border-y border-white/10 bg-black/30 backdrop-blur-lg">
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/8">
                <p className="text-[10px] uppercase tracking-[.25em] text-slate-400 font-bold">
                  Transmissões disponíveis · {publicRooms.length}
                </p>
                <button
                  onClick={() => { soundEngine.playButtonClick(); onRefreshRooms(); }}
                  className="text-[10px] text-cyan-200 font-bold hover:text-white"
                >
                  ATUALIZAR ↻
                </button>
              </div>
              <div className="max-h-36 overflow-y-auto">
                {publicRooms.length === 0 ? (
                  <p className="px-5 py-6 text-xs text-slate-500">Nenhum sinal público encontrado.</p>
                ) : publicRooms.map(room => (
                  <button
                    key={room.code}
                    onClick={() => { soundEngine.playButtonClick(); onJoinRoom(room.code); }}
                    className="w-full flex items-center justify-between px-5 py-3 border-b border-white/5 hover:bg-white/5 text-left transition-colors"
                  >
                    <span>
                      <strong className="block text-xs text-white">{room.name}</strong>
                      <small className="text-[10px] text-slate-500">{room.playerCount}/{room.maxPlayers} tripulantes</small>
                    </span>
                    <span className="font-mono text-xs text-cyan-200">{room.code} →</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};
