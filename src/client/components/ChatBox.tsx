import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, PlayerPrivateData } from '../../shared/types';
import { PLAYER_COLORS } from '../../shared/constants';
import { soundEngine } from '../audio/soundEffects';

interface Props {
  messages: ChatMessage[];
  self: PlayerPrivateData;
  onSendMessage: (text: string) => void;
}

export const ChatBox: React.FC<Props> = ({ messages, self, onSendMessage }) => {
  const [text, setText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isSelfDead = self.state === 'DEAD' || self.state === 'GHOST';

  // Filter messages: living players only see non-ghost messages
  const visibleMessages = messages.filter(msg => {
    if (msg.isSystem) return true;
    if (isSelfDead) return true; // ghosts see all messages
    return !msg.isGhostOnly; // living players only see alive messages
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [visibleMessages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    soundEngine.playButtonClick();
    onSendMessage(text.trim());
    setText('');
  };

  return (
    <div className="flex flex-col h-full bg-slate-950/90 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      {/* Header */}
      <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex justify-between items-center">
        <span className="text-xs font-bold text-slate-300">CHAT DA REUNIÃO</span>
        {isSelfDead && <span className="text-[10px] bg-purple-950 text-purple-400 border border-purple-800 px-2 py-0.5 rounded-full">CANAL DOS FANTASMAS</span>}
      </div>

      {/* Message List */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2 text-sm font-sans">
        {visibleMessages.map(msg => {
          const colorObj = PLAYER_COLORS.find(c => c.id === msg.senderColor) || PLAYER_COLORS[0];
          return (
            <div key={msg.id} className={`p-2 rounded-lg ${msg.isSystem ? 'bg-amber-950/40 border border-amber-800/40 text-amber-300 text-xs' : 'bg-slate-900/60'}`}>
              {!msg.isSystem && (
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colorObj.hex }} />
                  <span className="font-bold text-xs" style={{ color: colorObj.hex }}>{msg.senderName}</span>
                  {msg.isGhostOnly && <span className="text-[9px] text-purple-400 font-mono">(FANTASMA)</span>}
                </div>
              )}
              <div className="text-slate-200 text-xs break-words pl-4">{msg.text}</div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-2 bg-slate-900 border-t border-slate-800 flex gap-2">
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={isSelfDead ? "Conversar com outros fantasmas..." : "Digite sua mensagem..."}
          className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
          maxLength={150}
        />
        <button
          type="submit"
          className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold"
        >
          Enviar
        </button>
      </form>
    </div>
  );
};
