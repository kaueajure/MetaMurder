import React, { useState, useEffect, useRef } from 'react';
import { PlayerTask } from '../../shared/types';
import { soundEngine } from '../audio/soundEffects';

interface Props {
  task: PlayerTask;
  onComplete: () => void;
  onClose: () => void;
}

export const TaskOverlay: React.FC<Props> = ({ task, onComplete, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border-2 border-cyan-500/50 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
        <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-xl font-black text-cyan-400">TAREFA: {task.type}</h3>
            <p className="text-xs text-slate-400">{task.roomName}</p>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white flex items-center justify-center font-bold"
          >
            ✕
          </button>
        </div>

        {task.type === 'WIRING' && <WiringMiniGame onComplete={onComplete} />}
        {task.type === 'KEYPAD' && <KeypadMiniGame onComplete={onComplete} />}
        {task.type === 'CALIBRATE' && <CalibrateMiniGame onComplete={onComplete} />}
        {task.type === 'DOWNLOAD' && <DownloadMiniGame onComplete={onComplete} />}
        {task.type === 'SIMON' && <SimonMiniGame onComplete={onComplete} />}
        {task.type === 'REFILL' && <RefillMiniGame onComplete={onComplete} />}
        {task.type === 'SWITCHES' && <SwitchesMiniGame onComplete={onComplete} />}
      </div>
    </div>
  );
};

// 1. WIRING MINI GAME
const WiringMiniGame: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const colors = ['#EF4444', '#3B82F6', '#EAB308', '#10B981'];
  const [selectedWire, setSelectedWire] = useState<number | null>(null);
  const [connected, setConnected] = useState<{ [key: number]: number }>({});

  const handleRightClick = (rightIdx: number) => {
    if (selectedWire !== null) {
      if (selectedWire === rightIdx) {
        soundEngine.playButtonClick();
        const next = { ...connected, [selectedWire]: rightIdx };
        setConnected(next);
        setSelectedWire(null);
        if (Object.keys(next).length === 4) {
          soundEngine.playTaskComplete();
          onComplete();
        }
      }
    }
  };

  return (
    <div className="py-4">
      <p className="text-xs text-slate-400 mb-4 text-center">Conecte os fios correspondentes por cor:</p>
      <div className="flex justify-between items-center h-48 px-6 bg-slate-950 rounded-xl border border-slate-800">
        <div className="flex flex-col justify-around h-full">
          {colors.map((c, idx) => (
            <button
              key={`left_${idx}`}
              onClick={() => setSelectedWire(idx)}
              className={`w-8 h-8 rounded-full border-2 transition-transform ${selectedWire === idx ? 'scale-125 ring-2 ring-white' : ''}`}
              style={{ backgroundColor: c, borderColor: connected[idx] !== undefined ? '#22C55E' : '#FFFFFF' }}
            />
          ))}
        </div>
        <div className="flex flex-col justify-around h-full">
          {colors.map((c, idx) => (
            <button
              key={`right_${idx}`}
              onClick={() => handleRightClick(idx)}
              className="w-8 h-8 rounded-full border-2"
              style={{ backgroundColor: c, borderColor: '#FFFFFF' }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// 2. KEYPAD MINI GAME
const KeypadMiniGame: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [code] = useState(() => Math.floor(10000 + Math.random() * 90000).toString());
  const [input, setInput] = useState('');
  const [invalid, setInvalid] = useState(false);

  const handlePress = (num: string) => {
    soundEngine.playButtonClick();
    setInvalid(false);
    setInput(current => current.length < 5 ? current + num : current);
  };

  const submitCode = () => {
    soundEngine.playButtonClick();
    if (input === code) {
      soundEngine.playTaskComplete();
      onComplete();
    } else {
      setInvalid(true);
      setInput('');
    }
  };

  return (
    <div className="py-4 text-center">
      <div className="bg-slate-950 p-4 rounded-xl mb-4 border border-slate-800">
        <div className="text-xs text-slate-500 mb-1">CÓDIGO REQUERIDO: <span className="font-mono text-cyan-400">{code}</span></div>
        <div className={`font-mono text-3xl tracking-widest h-10 ${invalid ? 'text-rose-400' : 'text-emerald-400'}`}>
          {invalid ? 'ERRO' : input.padEnd(5, '_')}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
        {['1','2','3','4','5','6','7','8','9','C','0','✓'].map(btn => (
          <button
            key={btn}
            onClick={() => {
              if (btn === 'C') {
                setInput('');
                setInvalid(false);
              } else if (btn === '✓') {
                submitCode();
              } else {
                handlePress(btn);
              }
            }}
            className="py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold text-lg active:scale-95 border border-slate-700"
          >
            {btn}
          </button>
        ))}
      </div>
    </div>
  );
};

// 3. CALIBRATE MINI GAME
const CalibrateMiniGame: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [angle, setAngle] = useState(0);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setAngle(a => (a + 4) % 360);
    }, 20);
    return () => clearInterval(interval);
  }, []);

  const handleCalibrate = () => {
    soundEngine.playButtonClick();
    // Target zone is around 170..190 deg
    if (angle >= 160 && angle <= 200) {
      soundEngine.playTaskProgress();
      const nextStep = step + 1;
      setStep(nextStep);
      if (nextStep >= 3) {
        soundEngine.playTaskComplete();
        onComplete();
      }
    }
  };

  return (
    <div className="py-4 text-center">
      <p className="text-xs text-slate-400 mb-4">Pressione no momento em que o ponteiro estiver na área amarela ({step}/3):</p>
      <div className="relative w-48 h-48 mx-auto rounded-full bg-slate-950 border-4 border-slate-800 flex items-center justify-center mb-6">
        {/* Target indicator */}
        <div className="absolute w-6 h-6 bg-yellow-400/50 rounded-full" style={{ transform: 'translateY(70px)' }} />

        {/* Dial Needle */}
        <div 
          className="w-1 h-20 bg-cyan-400 rounded-full origin-bottom transition-transform"
          style={{ transform: `rotate(${angle}deg)` }}
        />
      </div>

      <button
        onClick={handleCalibrate}
        className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 font-bold rounded-xl text-white shadow-lg active:scale-98"
      >
        CALIBRAR
      </button>
    </div>
  );
};

// 4. DOWNLOAD MINI GAME
const DownloadMiniGame: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const completedRef = useRef(false);

  useEffect(() => {
    if (!downloading || completedRef.current) return;
    let currentProgress = 0;
    const timer = setInterval(() => {
      currentProgress = Math.min(100, currentProgress + 5);
      setProgress(currentProgress);
      if (currentProgress === 100) {
        clearInterval(timer);
        completedRef.current = true;
        soundEngine.playTaskComplete();
        onComplete();
      }
    }, 150);
    return () => clearInterval(timer);
  }, [downloading, onComplete]);

  return (
    <div className="py-6 text-center">
      <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 mb-6">
        <div className="text-sm font-semibold mb-3 text-slate-300">TRANSFERÊNCIA DE DADOS</div>
        <div className="w-full bg-slate-800 rounded-full h-6 overflow-hidden p-1">
          <div 
            className="bg-emerald-500 h-full rounded-full transition-all duration-150"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="text-xs text-slate-400 mt-2 font-mono">{progress}% CONCLUÍDO</div>
      </div>

      {!downloading ? (
        <button
          onClick={() => { soundEngine.playButtonClick(); setDownloading(true); }}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 font-bold rounded-xl text-white shadow-lg"
        >
          BAIXAR DADOS
        </button>
      ) : (
        <div className="text-cyan-400 text-sm font-mono animate-pulse">Transferindo arquivos...</div>
      )}
    </div>
  );
};

// 5. SIMON MINI GAME
const SimonMiniGame: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [sequence] = useState(() => Array.from({ length: 4 }, () => Math.floor(Math.random() * 4)));
  const [playerInput, setPlayerInput] = useState<number[]>([]);
  const [showingSequence, setShowingSequence] = useState(true);
  const [activePad, setActivePad] = useState<number | null>(null);
  const [replayKey, setReplayKey] = useState(0);
  const colors = ['#EF4444', '#3B82F6', '#EAB308', '#10B981'];

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    setShowingSequence(true);
    setActivePad(null);

    sequence.forEach((pad, index) => {
      timers.push(setTimeout(() => setActivePad(pad), 400 + index * 700));
      timers.push(setTimeout(() => setActivePad(null), 850 + index * 700));
    });
    timers.push(setTimeout(() => setShowingSequence(false), 500 + sequence.length * 700));

    return () => timers.forEach(clearTimeout);
  }, [sequence, replayKey]);

  const handleClick = (idx: number) => {
    if (showingSequence) return;
    soundEngine.playButtonClick();
    const next = [...playerInput, idx];

    if (next[next.length - 1] !== sequence[next.length - 1]) {
      setPlayerInput([]);
      setReplayKey(key => key + 1);
      return;
    }

    setPlayerInput(next);
    if (next.length === sequence.length) {
      soundEngine.playTaskComplete();
      onComplete();
    }
  };

  return (
    <div className="py-4 text-center">
      <p className="text-xs text-slate-400 mb-4">
        {showingSequence ? 'Observe a sequência de luzes...' : `Repita a sequência (${playerInput.length}/${sequence.length})`}
      </p>
      <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto mb-4">
        {colors.map((c, idx) => (
          <button
            key={idx}
            disabled={showingSequence}
            onClick={() => handleClick(idx)}
            className={`h-24 rounded-2xl border-4 active:scale-95 shadow-lg transition-all ${
              activePad === idx ? 'border-white scale-105 brightness-150' : 'border-white/20 brightness-75'
            }`}
            style={{ backgroundColor: c, boxShadow: activePad === idx ? `0 0 30px ${c}` : undefined }}
          />
        ))}
      </div>
      {!showingSequence && (
        <button
          onClick={() => {
            setPlayerInput([]);
            setReplayKey(key => key + 1);
          }}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs text-slate-300"
        >
          MOSTRAR NOVAMENTE
        </button>
      )}
    </div>
  );
};

// 6. REFILL MINI GAME
const RefillMiniGame: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [fill, setFill] = useState(0);
  const fillIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completedRef = useRef(false);

  const addFuel = () => {
    setFill(f => {
      const next = Math.min(100, f + 4);
      if (next >= 100) {
        if (!completedRef.current) {
          completedRef.current = true;
          soundEngine.playTaskComplete();
          onComplete();
        }
        return 100;
      }
      return next;
    });
  };

  const startFilling = () => {
    if (fillIntervalRef.current || completedRef.current) return;
    soundEngine.playTaskProgress();
    addFuel();
    fillIntervalRef.current = setInterval(addFuel, 70);
  };

  const stopFilling = () => {
    if (fillIntervalRef.current) {
      clearInterval(fillIntervalRef.current);
      fillIntervalRef.current = null;
    }
  };

  useEffect(() => stopFilling, []);

  return (
    <div className="py-6 text-center">
      <div className="w-24 h-48 mx-auto bg-slate-950 border-4 border-slate-800 rounded-xl relative overflow-hidden mb-6 flex items-end p-1">
        <div 
          className="w-full bg-amber-500 rounded-lg transition-all duration-75"
          style={{ height: `${fill}%` }}
        />
      </div>

      <button
        onPointerDown={startFilling}
        onPointerUp={stopFilling}
        onPointerLeave={stopFilling}
        onPointerCancel={stopFilling}
        className="w-full py-4 bg-amber-600 hover:bg-amber-500 font-bold rounded-xl text-white shadow-lg active:scale-95"
      >
        SEGURE PARA ABASTECER
      </button>
    </div>
  );
};

// 7. SWITCHES MINI GAME
const SwitchesMiniGame: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [switches, setSwitches] = useState([false, false, false, false]);

  const toggle = (idx: number) => {
    soundEngine.playButtonClick();
    const next = [...switches];
    next[idx] = !next[idx];
    setSwitches(next);

    if (next.every(Boolean)) {
      soundEngine.playTaskComplete();
      onComplete();
    }
  };

  return (
    <div className="py-6 text-center">
      <p className="text-xs text-slate-400 mb-6">Ligue todos os disjuntores:</p>
      <div className="flex justify-around items-center bg-slate-950 p-6 rounded-xl border border-slate-800">
        {switches.map((val, idx) => (
          <button
            key={idx}
            onClick={() => toggle(idx)}
            className={`w-12 h-24 rounded-full p-2 flex flex-col justify-between transition-colors ${val ? 'bg-emerald-600' : 'bg-rose-950 border border-rose-800'}`}
          >
            <div className={`w-8 h-8 rounded-full bg-white transition-transform ${val ? 'translate-y-12' : ''}`} />
          </button>
        ))}
      </div>
    </div>
  );
};
