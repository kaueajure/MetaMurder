import React, { useState } from 'react';
import { SabotageState } from '../../shared/types';
import { soundEngine } from '../audio/soundEffects';

interface Props {
  sabotage: SabotageState;
  onResolveNode: (nodeId: string) => void;
  onClose: () => void;
}

export const SabotageOverlay: React.FC<Props> = ({ sabotage, onResolveNode, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border-2 border-rose-500/50 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
        <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-xl font-black text-rose-500 animate-pulse">SABOTAGEM EM ANDAMENTO</h3>
            <p className="text-xs text-slate-400">Restauração do Sistema</p>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white flex items-center justify-center font-bold"
          >
            ✕
          </button>
        </div>

        {sabotage.activeType === 'LIGHTS' && (
          <LightsFix onResolve={() => { onResolveNode('LIGHTS_BREAKER'); onClose(); }} />
        )}

        {sabotage.activeType === 'REACTOR' && (
          <ReactorFix onResolve={() => { onResolveNode('REACTOR_PAD_1'); onClose(); }} />
        )}

        {sabotage.activeType === 'O2' && (
          <O2Fix onResolve={() => { onResolveNode('O2_KEYPAD_1'); onClose(); }} />
        )}
      </div>
    </div>
  );
};

const LightsFix: React.FC<{ onResolve: () => void }> = ({ onResolve }) => {
  const [switches, setSwitches] = useState([false, false, false, false, false]);

  const toggle = (idx: number) => {
    soundEngine.playButtonClick();
    const next = [...switches];
    next[idx] = !next[idx];
    setSwitches(next);

    if (next.every(Boolean)) {
      soundEngine.playTaskComplete();
      onResolve();
    }
  };

  return (
    <div className="py-4 text-center">
      <p className="text-sm text-slate-300 mb-6">Ligue todas as chaves do disjuntor principal:</p>
      <div className="flex justify-around items-center bg-slate-950 p-6 rounded-xl border border-slate-800 mb-6">
        {switches.map((val, idx) => (
          <button
            key={idx}
            onClick={() => toggle(idx)}
            className={`w-10 h-20 rounded-full p-1.5 flex flex-col justify-between transition-colors ${val ? 'bg-emerald-500' : 'bg-rose-900 border border-rose-700'}`}
          >
            <div className={`w-7 h-7 rounded-full bg-white transition-transform ${val ? 'translate-y-10' : ''}`} />
          </button>
        ))}
      </div>
    </div>
  );
};

const ReactorFix: React.FC<{ onResolve: () => void }> = ({ onResolve }) => {
  const [holding, setHolding] = useState(false);

  const handleHold = () => {
    soundEngine.playTaskProgress();
    setHolding(true);
    setTimeout(() => {
      soundEngine.playTaskComplete();
      onResolve();
    }, 1500);
  };

  return (
    <div className="py-6 text-center">
      <p className="text-sm text-slate-300 mb-6">Segure a palma na impressora biométrica:</p>
      <button
        onMouseDown={handleHold}
        onTouchStart={handleHold}
        className={`w-40 h-40 mx-auto rounded-full border-4 flex items-center justify-center text-4xl transition-all ${holding ? 'bg-emerald-600/30 border-emerald-500 shadow-lg shadow-emerald-500/50' : 'bg-slate-950 border-rose-500 text-rose-500'}`}
      >
        ✋
      </button>
      <p className="text-xs text-slate-500 mt-4 font-mono">2 jogadores necessários no reator</p>
    </div>
  );
};

const O2Fix: React.FC<{ onResolve: () => void }> = ({ onResolve }) => {
  const [code] = useState('02914');
  const [input, setInput] = useState('');

  const handlePress = (num: string) => {
    soundEngine.playButtonClick();
    const next = input + num;
    setInput(next);

    if (next === code) {
      soundEngine.playTaskComplete();
      onResolve();
    } else if (next.length >= 5) {
      setTimeout(() => setInput(''), 300);
    }
  };

  return (
    <div className="py-4 text-center">
      <div className="bg-slate-950 p-4 rounded-xl mb-4 border border-slate-800">
        <div className="text-xs text-slate-400 mb-1">CÓDIGO DE EMERGÊNCIA O2: <span className="font-mono text-cyan-400">{code}</span></div>
        <div className="font-mono text-3xl text-rose-500 tracking-widest h-10">{input || '_____'}</div>
      </div>

      <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
        {['1','2','3','4','5','6','7','8','9','C','0','✓'].map(btn => (
          <button
            key={btn}
            onClick={() => btn === 'C' ? setInput('') : btn === '✓' ? null : handlePress(btn)}
            className="py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold text-lg active:scale-95 border border-slate-700"
          >
            {btn}
          </button>
        ))}
      </div>
    </div>
  );
};
