
import React from 'react';
import { useAgent } from '../contexts/AgentContext';
import { Lead } from '../types';
import { Upload, Play, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

export function Leads() {
  const { leads, processLeadBatch, isProcessing } = useAgent();

  const runSimulation = () => {
    // Simulating a CSV Upload from a source like Zillow or a local CRM export
    const dummyBatch: Lead[] = [
      { 
        id: Math.random().toString(36).slice(2, 8).toUpperCase(), 
        rawSource: 'Zillow', 
        content: 'Hi, I saw 123 Main St. Is it still available? I have a pre-approval letter and need to close fast as I sold my home.', 
        status: 'new',
        timestamp: new Date().toISOString()
      },
      { 
        id: Math.random().toString(36).slice(2, 8).toUpperCase(), 
        rawSource: 'Website', 
        content: 'Just browsing current rates for 30yr fixed. Not looking to buy for another year.', 
        status: 'new',
        timestamp: new Date().toISOString()
      },
      { 
        id: Math.random().toString(36).slice(2, 8).toUpperCase(), 
        rawSource: 'Open House', 
        content: 'Relocating from Chicago for work. Need a place by September 1st. Cash buyer preferred if needed.', 
        status: 'new',
        timestamp: new Date().toISOString()
      },
    ];
    processLeadBatch(dummyBatch);
  };

  return (
    <div className="p-8 h-full overflow-y-auto bg-slate-50">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Lead Intelligence Board</h1>
          <p className="text-slate-500 mt-1 font-medium">Batch process raw records using Gemini Pro Reasoning Engine.</p>
        </div>
        <button
          onClick={runSimulation}
          disabled={isProcessing}
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl hover:shadow-2xl active:scale-95 disabled:opacity-70 disabled:shadow-none"
        >
          {isProcessing ? <Play className="w-4 h-4 animate-spin text-blue-400" /> : <Upload className="w-4 h-4 text-blue-400" />}
          Import & Analyze Batch
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-400 font-black uppercase tracking-[0.2em] text-[10px] border-b border-slate-200">
              <th className="px-8 py-6">Source</th>
              <th className="px-8 py-6">Message Content</th>
              <th className="px-8 py-6">AI Underwriting Analysis</th>
              <th className="px-8 py-6 text-center">Urgency</th>
              <th className="px-8 py-6 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {leads.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-8 py-24 text-center">
                  <div className="flex flex-col items-center max-w-xs mx-auto">
                    <div className="p-4 bg-slate-50 rounded-full mb-6">
                       <Upload className="w-10 h-10 text-slate-300" />
                    </div>
                    <p className="font-black uppercase tracking-widest text-slate-600 text-xs">Queue Empty</p>
                    <p className="text-xs mt-2 text-slate-400 font-medium">Import a raw data stream to begin automated underwriting and intelligence scoring.</p>
                  </div>
                </td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-8 py-6">
                     <div className="font-black text-slate-900 text-xs uppercase tracking-tighter">{lead.rawSource}</div>
                     <div className="text-[10px] font-bold text-slate-400 mt-1">ID: {lead.id}</div>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-slate-600 text-xs leading-relaxed max-w-xs line-clamp-2 group-hover:line-clamp-none transition-all duration-300 font-medium italic">
                      "{lead.content}"
                    </p>
                  </td>
                  <td className="px-8 py-6 max-w-sm">
                    {lead.status === 'processed' ? (
                      <div className="animate-in fade-in duration-500">
                        <p className="text-slate-800 text-xs font-bold leading-relaxed">{lead.analysis}</p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className="flex space-x-1">
                           <span className="w-1.5 h-1.5 bg-blue-300 rounded-full animate-pulse" />
                           <span className="w-1.5 h-1.5 bg-blue-300 rounded-full animate-pulse [animation-delay:0.2s]" />
                           <span className="w-1.5 h-1.5 bg-blue-300 rounded-full animate-pulse [animation-delay:0.4s]" />
                        </span>
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Processing...</span>
                      </div>
                    )}
                  </td>
                  <td className="px-8 py-6 text-center">
                    {lead.urgencyScore !== undefined ? (
                      <div className={`inline-flex flex-col items-center justify-center w-14 h-10 rounded-xl border-2 font-black shadow-sm ${
                        lead.urgencyScore > 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                        lead.urgencyScore > 50 ? 'bg-amber-50 text-amber-700 border-amber-100' :
                        'bg-slate-50 text-slate-500 border-slate-200'
                      }`}>
                        <span className="text-lg leading-none">{lead.urgencyScore}</span>
                        <span className="text-[8px] uppercase tracking-tighter mt-0.5">/ 100</span>
                      </div>
                    ) : (
                      <div className="w-14 h-10 bg-slate-50 border border-slate-100 rounded-xl mx-auto" />
                    )}
                  </td>
                  <td className="px-8 py-6 text-center">
                    {lead.status === 'processed' ? (
                       <div className="flex justify-center"><CheckCircle2 className="w-6 h-6 text-emerald-500" /></div>
                    ) : (
                       <div className="flex justify-center"><Clock className="w-6 h-6 text-blue-400 animate-spin" /></div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-8 flex justify-between items-center px-4">
         <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Compliance Ledger: Active</p>
         <div className="flex items-center gap-2">
           <AlertCircle className="w-4 h-4 text-slate-300" />
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Verified Reasoning Loop</p>
         </div>
      </div>
    </div>
  );
}
