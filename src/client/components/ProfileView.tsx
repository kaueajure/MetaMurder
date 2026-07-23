import React, { useState } from 'react';
import { UserProfile } from '../../shared/types';

interface Props {
  profile: UserProfile;
  onSaveName: (username: string) => Promise<void>;
  onClose: () => void;
}

export const ProfileView: React.FC<Props> = ({ profile, onSaveName, onClose }) => {
  const { stats } = profile;
  const [username, setUsername] = useState(profile.username);
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState('');
  const [nameSaved, setNameSaved] = useState(false);

  const handleNameSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalized = username.trim().replace(/\s+/g, ' ');
    if (normalized.length < 2 || normalized.length > 15) {
      setNameError('O nome deve ter entre 2 e 15 caracteres.');
      return;
    }

    setSavingName(true);
    setNameError('');
    setNameSaved(false);
    try {
      await onSaveName(normalized);
      setUsername(normalized);
      setNameSaved(true);
    } catch (error) {
      setNameError(error instanceof Error ? error.message : 'Não foi possível salvar o nome.');
    } finally {
      setSavingName(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border-2 border-cyan-500/50 rounded-2xl p-6 w-full max-w-md max-h-[92vh] overflow-y-auto shadow-2xl relative">
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

        <form onSubmit={handleNameSubmit} className="mb-5 border border-cyan-500/20 bg-slate-950/75 p-4">
          <label htmlFor="profile-username" className="block text-[10px] font-bold tracking-[.2em] text-cyan-300 uppercase mb-2">
            Nome do tripulante
          </label>
          <div className="flex gap-2">
            <input
              id="profile-username"
              type="text"
              value={username}
              onChange={event => {
                setUsername(event.target.value);
                setNameError('');
                setNameSaved(false);
              }}
              maxLength={15}
              autoComplete="off"
              className="min-w-0 flex-1 bg-black/50 border border-slate-700 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
            />
            <button
              type="submit"
              disabled={savingName || username.trim() === profile.username}
              className="px-4 bg-cyan-500 text-slate-950 text-xs font-black disabled:bg-slate-800 disabled:text-slate-500"
            >
              {savingName ? 'SALVANDO…' : 'ALTERAR'}
            </button>
          </div>
          <div className="mt-2 min-h-4 text-[10px]">
            {nameError && <span className="text-rose-400">{nameError}</span>}
            {nameSaved && <span className="text-emerald-400">Nome atualizado.</span>}
            {!nameError && !nameSaved && <span className="text-slate-600">2–15 caracteres. Letras, números, espaço, hífen e _.</span>}
          </div>
        </form>

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
