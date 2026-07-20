import React from 'react';
import { UserProfile } from '../../shared/types';

interface Props {
  profile: UserProfile;
  onClose: () => void;
}

export const ProfileView: React.FC<Props> = ({ profile, onClose }) => {
  const { stats } = profile;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border-2 border-cyan-500/50 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
        <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-xl font-black text-cyan-400">PERFIL DO JOGADOR</h3>
            <p className="text-xs text-slate-400">{profile.username} {profile.isGuest && '(Convidado)'}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white flex items-center justify-center font-bold"
          >
            ✕
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
            <div className="text-2xl font-black text-white">{stats.gamesPlayed}</div>
            <div className="text-[10px] text-slate-500 font-mono uppercase">PARTIDAS JOGADAS</div>
          </div>
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
            <div className="text-2xl font-black text-emerald-400">{stats.crewmateWins}</div>
            <div className="text-[10px] text-slate-500 font-mono uppercase">VITÓRIAS TRIPULANTE</div>
          </div>
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
            <div className="text-2xl font-black text-rose-500">{stats.impostorWins}</div>
            <div className="text-[10px] text-slate-500 font-mono uppercase">VITÓRIAS ASSASSINO</div>
          </div>
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
            <div className="text-2xl font-black text-amber-400">{stats.kills}</div>
            <div className="text-[10px] text-slate-500 font-mono uppercase">ELIMINAÇÕES</div>
          </div>
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
            <div className="text-2xl font-black text-cyan-400">{stats.tasksCompleted}</div>
            <div className="text-[10px] text-slate-500 font-mono uppercase">TAREFAS CONCLUÍDAS</div>
          </div>
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
            <div className="text-2xl font-black text-purple-400">{stats.correctVotes}</div>
            <div className="text-[10px] text-slate-500 font-mono uppercase">VOTOS CERTOS</div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 bg-slate-800 hover:bg-slate-700 font-bold rounded-xl text-white"
        >
          FECHAR
        </button>
      </div>
    </div>
  );
};
