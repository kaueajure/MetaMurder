import React, { useState } from 'react';
import { soundEngine } from '../audio/soundEffects';

interface Props {
  onClose: () => void;
}

export const SettingsView: React.FC<Props> = ({ onClose }) => {
  const [sfx, setSfx] = useState(soundEngine.sfxVolume * 100);
  const [master, setMaster] = useState(soundEngine.masterVolume * 100);

  const handleSfxChange = (val: number) => {
    setSfx(val);
    soundEngine.sfxVolume = val / 100;
  };

  const handleMasterChange = (val: number) => {
    setMaster(val);
    soundEngine.masterVolume = val / 100;
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border-2 border-cyan-500/50 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
        <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-3">
          <h3 className="text-xl font-black text-cyan-400">CONFIGURAÇÕES DE ÁUDIO & CONTROLES</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white flex items-center justify-center font-bold"
          >
            ✕
          </button>
        </div>

        {/* Audio Volume Sliders */}
        <div className="space-y-4 mb-6">
          <div>
            <div className="flex justify-between text-xs font-bold text-slate-400 mb-1">
              <span>VOLUME GERAL</span>
              <span>{Math.round(master)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={master}
              onChange={e => handleMasterChange(Number(e.target.value))}
              className="w-full accent-cyan-500 bg-slate-950"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-bold text-slate-400 mb-1">
              <span>EFEITOS SONOROS (SFX)</span>
              <span>{Math.round(sfx)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={sfx}
              onChange={e => handleSfxChange(Number(e.target.value))}
              className="w-full accent-cyan-500 bg-slate-950"
            />
          </div>
        </div>

        {/* Controls Reference */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 mb-6">
          <div className="text-xs font-bold text-slate-400 mb-3 uppercase">CONTROLES DO TECLADO</div>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div><span className="text-cyan-400 font-bold">WASD / SETAS</span>: Mover</div>
            <div><span className="text-cyan-400 font-bold">E / ESPAÇO</span>: Interagir</div>
            <div><span className="text-rose-400 font-bold">Q</span>: Matar (Assassino)</div>
            <div><span className="text-amber-400 font-bold">R</span>: Denunciar Corpo</div>
            <div><span className="text-purple-400 font-bold">V</span>: Entrar no Duto</div>
            <div><span className="text-cyan-400 font-bold">X</span>: Sabotar</div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 font-bold rounded-xl text-white shadow-lg"
        >
          SALVAR
        </button>
      </div>
    </div>
  );
};
