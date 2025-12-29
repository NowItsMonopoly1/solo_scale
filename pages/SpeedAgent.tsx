
import React, { useState, useRef, useEffect } from 'react';
import { useAgent } from '../contexts/AgentContext';
import { Send, Bot, Globe, MessageSquare } from 'lucide-react';

export function SpeedAgent() {
  const { messages, sendMessage, isProcessing } = useAgent();
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isProcessing]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isProcessing) return;
    sendMessage(input);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Header */}
      <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-white z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 p-2.5 rounded-xl shadow-lg shadow-blue-200">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900">Speed Agent</h2>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-black uppercase tracking-widest">
              <Globe className="w-3 h-3 text-blue-500" />
              <span>Google Search Grounding Active</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-100 rounded-full">
           <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
           <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-tighter">Verified Mode</span>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50/50">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-slate-300 opacity-40">
            <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm">
              <MessageSquare className="w-12 h-12 mb-4 mx-auto text-blue-500" />
              <p className="font-black uppercase tracking-widest text-xs">Ready for Intelligence Retrieval</p>
              <p className="text-[10px] mt-1 text-center font-medium">Ask about market rates, inventory, or economic news.</p>
            </div>
          </div>
        )}
        
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
            <div className={`max-w-[80%] lg:max-w-[70%] rounded-2xl p-5 shadow-sm ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-none' 
                : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
            }`}>
              <p className="leading-relaxed whitespace-pre-wrap text-sm font-medium">{msg.content}</p>
              
              {/* Citation Bubbles */}
              {msg.citations && msg.citations.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-2">
                  <div className="w-full text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Source Verification</div>
                  {msg.citations.map((cite, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 transition-colors">
                      <Globe className="w-3 h-3 text-blue-500" />
                      <span className="truncate max-w-[200px]">{cite}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Loading Indicator */}
        {isProcessing && (
          <div className="flex justify-start animate-in fade-in duration-300">
             <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none p-5 flex items-center gap-3 shadow-sm">
               <div className="flex space-x-1.5">
                 <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
                 <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:0.1s]" />
                 <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]" />
               </div>
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sourcing Intelligence</span>
             </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="p-6 bg-white border-t border-slate-200 shadow-[0_-4px_12px_rgba(0,0,0,0.02)]">
        <form onSubmit={handleSend} className="relative max-w-4xl mx-auto flex gap-3">
          <input
            type="text"
            className="flex-1 pl-5 pr-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all text-sm font-bold placeholder:text-slate-400 shadow-inner"
            placeholder="Ask about interest rates, inventory in specific zips, or market trends..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isProcessing}
          />
          <button 
            type="submit"
            disabled={!input.trim() || isProcessing}
            className="p-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-200 active:scale-95 flex items-center justify-center"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
        <div className="mt-4 flex justify-center items-center gap-3">
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">SoloScale Hybrid Engine</p>
          <div className="h-px w-8 bg-slate-100" />
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Compliance Verified</p>
        </div>
      </div>
    </div>
  );
}
