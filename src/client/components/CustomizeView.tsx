import React, { useState } from 'react';
import { PLAYER_COLORS, HATS, SKINS } from '../../shared/constants';
import { PlayerCustomization } from '../../shared/types';
import { soundEngine } from '../audio/soundEffects';

interface Props {
  initial: PlayerCustomization;
  onSave: (custom: PlayerCustomization) => void;
  onClose: () => void;
}

export const CustomizeView: React.FC<Props> = ({ initial, onSave, onClose }) => {
  const [color, setColor] = useState(initial.color);
  const [hatId, setHatId] = useState(initial.hatId);
  const [skinId, setSkinId] = useState(initial.skinId);

  const selectedColor = PLAYER_COLORS.find(c => c.id === color) || PLAYER_COLORS[0];

  const handleSave = () => {
    soundEngine.playButtonClick();
    onSave({ color, hatId, skinId });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border-2 border-cyan-500/50 rounded-2xl p-6 w-full max-w-lg shadow-2xl relative">
        <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-3">
          <h3 className="text-xl font-black text-cyan-400">PERSONALIZAR PERSONAGEM</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white flex items-center justify-center font-bold"
          >
            ✕
          </button>
        </div>

        {/* Live Astronaut Preview */}
        <div className="w-36 h-36 mx-auto bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-center mb-6 shadow-inner relative">
          <div className="w-16 h-20 rounded-2xl relative" style={{ backgroundColor: selectedColor.hex }}>
            {/* Visor */}
            <div className="w-8 h-8 rounded-lg bg-cyan-400 absolute right-1 top-2 border border-white/40" />
            {/* Backpack */}
            <div className="w-4 h-12 rounded-l-md absolute -left-4 top-4" style={{ backgroundColor: selectedColor.darkHex }} />
          </div>
        </div>

        {/* Color Palette Picker */}
        <div className="mb-6">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">COR DO TRAJE</label>
          <div className="grid grid-cols-6 gap-2">
            {PLAYER_COLORS.map(c => (
              <button
                key={c.id}
                onClick={() => { soundEngine.playButtonClick(); setColor(c.id); }}
                className={`w-10 h-10 rounded-xl border-2 transition-transform ${color === c.id ? 'scale-115 ring-2 ring-white border-white' : 'border-transparent hover:scale-105'}`}
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
        </div>

        {/* Hats Picker */}
        <div className="mb-6">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">CHAPÉUS & ACESSÓRIOS</label>
          <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
            {HATS.map(h => (
              <button
                key={h.id}
                onClick={() => { soundEngine.playButtonClick(); setHatId(h.id); }}
                className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all ${hatId === h.id ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'}`}
              >
                {h.name}
              </button>
            ))}
          </div>
        </div>

        {/* Skins Picker */}
        <div className="mb-6">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">TRAJES (SKINS)</label>
          <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
            {SKINS.map(s => (
              <button
                key={s.id}
                onClick={() => { soundEngine.playButtonClick(); setSkinId(s.id); }}
                className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all ${skinId === s.id ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'}`}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleSave}
          className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 font-bold rounded-xl text-white shadow-lg transition-all"
        >
          SALVAR ALTERAÇÕES
        </button>
      </div>
    </div>
  );
};
