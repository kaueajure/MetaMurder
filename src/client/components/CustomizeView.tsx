import React, { useState } from 'react';
import { PLAYER_COLORS, HATS, SKINS } from '../../shared/constants';
import { PlayerCustomization } from '../../shared/types';
import { soundEngine } from '../audio/soundEffects';
import { CharacterPreview } from './CharacterPreview';

interface Props {
  initial: PlayerCustomization;
  onSave: (custom: PlayerCustomization) => Promise<void> | void;
  onClose: () => void;
}

const HAT_ICONS: Record<string, string> = {
  NONE: '—',
  CAPTAIN_HAT: '⚓',
  CROWN: '♛',
  VR_GOGGLES: '⌐',
  VIKING_HELMET: 'ᛉ',
  ANTENNA: '◉',
  HEADPHONES: '♫',
  CAT_EARS: 'ᓚ'
};

const SKIN_DESCRIPTIONS: Record<string, string> = {
  DEFAULT: 'Traje orbital clássico',
  CYBER_ARMOR: 'Placas metálicas e luz de energia',
  LAB_COAT: 'Jaleco técnico da enfermaria',
  STEALTH_SUIT: 'Material escuro de baixa assinatura'
};

export const CustomizeView: React.FC<Props> = ({ initial, onSave, onClose }) => {
  const [color, setColor] = useState(initial.color);
  const [hatId, setHatId] = useState(initial.hatId);
  const [skinId, setSkinId] = useState(initial.skinId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const customization = { color, hatId, skinId };
  const selectedColor = PLAYER_COLORS.find(candidate => candidate.id === color) ?? PLAYER_COLORS[0];

  const select = (update: () => void) => {
    soundEngine.playButtonClick();
    update();
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    soundEngine.playButtonClick();
    try {
      await onSave(customization);
      onClose();
    } catch {
      setError('Não foi possível salvar. Tente novamente.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#02050c]/92 backdrop-blur-xl z-50 flex items-center justify-center p-3 md:p-8">
      <div className="relative w-full max-w-5xl max-h-[94vh] overflow-hidden rounded-[28px] border border-cyan-300/20 bg-[#07101d] shadow-[0_30px_100px_rgba(0,0,0,.75),0_0_50px_rgba(34,211,238,.08)]">
        <div className="absolute inset-0 pointer-events-none opacity-30 bg-[radial-gradient(circle_at_20%_10%,rgba(34,211,238,.22),transparent_34%),radial-gradient(circle_at_90%_90%,rgba(245,158,11,.12),transparent_30%)]" />

        <header className="relative flex items-center justify-between px-5 md:px-8 py-4 border-b border-white/10 bg-black/20">
          <div>
            <p className="text-[10px] uppercase tracking-[.35em] text-cyan-300/70 font-bold">Hangar de equipamento</p>
            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">Monte seu tripulante</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar personalização"
            className="w-10 h-10 rounded-full border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
          >
            ✕
          </button>
        </header>

        <div className="relative grid lg:grid-cols-[.82fr_1.18fr] max-h-[calc(94vh-74px)] overflow-y-auto">
          <section className="relative min-h-[360px] lg:min-h-[650px] border-b lg:border-b-0 lg:border-r border-white/10 overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(8,145,178,.22),transparent_58%)]" />
            <div className="absolute left-1/2 -translate-x-1/2 bottom-[13%] w-[65%] h-[14%] rounded-[50%] bg-cyan-400/10 blur-xl" />
            <div className="absolute left-1/2 -translate-x-1/2 bottom-[14%] w-[58%] h-[10%] rounded-[50%] border border-cyan-300/20 bg-black/30 [transform:translateX(-50%)_perspective(500px)_rotateX(62deg)]" />

            <div className="absolute inset-x-0 top-5 text-center z-10">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-300/20 bg-emerald-400/10 text-[10px] uppercase tracking-widest text-emerald-300 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                Prévia em tempo real
              </span>
            </div>

            <div className="absolute inset-6 top-12">
              <CharacterPreview customization={customization} />
            </div>

            <div className="absolute inset-x-5 bottom-5 p-4 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">Configuração atual</p>
                  <p className="font-black text-white">{selectedColor.name} · {HATS.find(hat => hat.id === hatId)?.name}</p>
                </div>
                <span
                  className="w-9 h-9 rounded-full border-2 border-white/30 shadow-lg"
                  style={{ backgroundColor: selectedColor.hex, boxShadow: `0 0 20px ${selectedColor.hex}55` }}
                />
              </div>
            </div>
          </section>

          <section className="p-5 md:p-8 space-y-7">
            <div>
              <div className="flex items-end justify-between mb-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[.25em] text-cyan-300/60 font-bold">01 · Pintura</p>
                  <h3 className="font-black text-white">Cor do traje</h3>
                </div>
                <span className="text-xs font-bold" style={{ color: selectedColor.hex }}>{selectedColor.name}</span>
              </div>
              <div className="grid grid-cols-6 gap-2.5">
                {PLAYER_COLORS.map(candidate => (
                  <button
                    key={candidate.id}
                    onClick={() => select(() => setColor(candidate.id))}
                    aria-label={`Selecionar cor ${candidate.name}`}
                    title={candidate.name}
                    className={`relative aspect-square rounded-xl transition-all ${
                      color === candidate.id
                        ? 'scale-105 ring-2 ring-white ring-offset-2 ring-offset-[#07101d]'
                        : 'hover:scale-105 opacity-75 hover:opacity-100'
                    }`}
                    style={{
                      background: `linear-gradient(145deg, ${candidate.hex}, ${candidate.darkHex})`,
                      boxShadow: color === candidate.id ? `0 0 20px ${candidate.hex}66` : undefined
                    }}
                  >
                    <span className="absolute inset-1 rounded-lg border border-white/20" />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-[.25em] text-cyan-300/60 font-bold">02 · Acessório</p>
              <h3 className="font-black text-white mb-3">Capacete e chapéu</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {HATS.map(hat => (
                  <button
                    key={hat.id}
                    onClick={() => select(() => setHatId(hat.id))}
                    className={`min-h-20 p-3 rounded-xl border text-left transition-all ${
                      hatId === hat.id
                        ? 'border-cyan-300/60 bg-cyan-400/10 shadow-[inset_0_0_18px_rgba(34,211,238,.08)]'
                        : 'border-white/8 bg-white/[.025] hover:border-white/20 hover:bg-white/5'
                    }`}
                  >
                    <span className={`block text-xl mb-1 ${hatId === hat.id ? 'text-cyan-300' : 'text-slate-500'}`}>
                      {HAT_ICONS[hat.id] ?? '•'}
                    </span>
                    <span className="block text-[10px] leading-tight font-bold text-slate-200">{hat.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-[.25em] text-cyan-300/60 font-bold">03 · Equipamento</p>
              <h3 className="font-black text-white mb-3">Modelo do traje</h3>
              <div className="grid sm:grid-cols-2 gap-2">
                {SKINS.map(skin => (
                  <button
                    key={skin.id}
                    onClick={() => select(() => setSkinId(skin.id))}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      skinId === skin.id
                        ? 'border-amber-300/50 bg-amber-400/10'
                        : 'border-white/8 bg-white/[.025] hover:border-white/20'
                    }`}
                  >
                    <span className={`block text-xs font-black ${skinId === skin.id ? 'text-amber-200' : 'text-white'}`}>
                      {skin.name}
                    </span>
                    <span className="block mt-1 text-[10px] text-slate-500">{SKIN_DESCRIPTIONS[skin.id]}</span>
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-xs text-rose-300">{error}</p>}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setColor(initial.color);
                  setHatId(initial.hatId);
                  setSkinId(initial.skinId);
                }}
                className="px-5 py-3 rounded-xl border border-white/10 text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5"
              >
                DESFAZER
              </button>
              <button
                disabled={saving}
                onClick={handleSave}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 disabled:opacity-60 text-sm font-black text-white shadow-[0_10px_30px_rgba(6,182,212,.22)] transition-all active:scale-[.99]"
              >
                {saving ? 'SALVANDO...' : 'EQUIPAR E SALVAR'}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
