
import React, { useState } from 'react';
import { AgentProvider, useAgent } from './contexts/AgentContext';
import { Dashboard } from './pages/Dashboard';
import { SpeedAgent } from './pages/SpeedAgent';
import { Leads } from './pages/Leads';
import { Documents } from './pages/Documents';
import { Settings } from './pages/Settings';
import PartnerActivityDashboard from './components/PartnerActivityDashboard';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LayoutDashboard, MessageSquare, Users, FileText, MoreHorizontal, ShieldCheck, Zap, Lock, Mail } from 'lucide-react';

const AppContent: React.FC = () => {
  const { user, login, subscription } = useAgent();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'chat' | 'leads' | 'documents' | 'partners' | 'settings'>('dashboard');
  const [emailInput, setEmailInput] = useState('');

  if (!user) {
    return (
      <div className="h-screen w-full bg-slate-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
          <div className="p-10 pt-12">
            <h1 className="text-4xl font-black tracking-tighter mb-2">SOLO<span className="text-blue-600">SCALE</span></h1>
            <p className="text-slate-500 text-sm font-medium mb-8">Sign in to your Enterprise Intelligence Hub</p>
            
            <form onSubmit={(e) => { e.preventDefault(); login(emailInput || 'demo@soloscale.ai'); }} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Email Workspace</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="email" 
                    placeholder="broker@office.ai" 
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all font-bold"
                  />
                </div>
              </div>
              <button 
                type="submit"
                className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all uppercase tracking-widest text-xs"
              >
                Access Command Center
              </button>
            </form>
          </div>
          <div className="bg-slate-50 p-6 flex items-center gap-3 justify-center text-[10px] font-black text-slate-400 uppercase tracking-widest border-t border-slate-100">
             <Lock size={12}/>
             AES-256 Intelligence Encryption Active
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-slate-50 font-sans text-slate-900 antialiased selection:bg-blue-100">
      
      {/* SaaS SIDEBAR */}
      <aside className="w-72 bg-slate-900 text-slate-300 flex flex-col flex-shrink-0 border-r border-slate-800 relative z-20 shadow-2xl">
        <div className="p-8">
          <h1 className="text-white text-3xl font-black tracking-tighter flex items-center gap-1 group cursor-default">
            SOLO<span className="text-blue-500 transition-colors group-hover:text-blue-400">SCALE</span>
          </h1>
          <div className="flex flex-col gap-1 mt-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
              <span className="px-2 py-0.5 rounded bg-slate-800/50 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 border border-slate-700/50">Enterprise v1.2</span>
            </div>
            <div className="flex items-center gap-2 mt-2 px-1">
               <span className={`w-1.5 h-1.5 rounded-full ${subscription.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
               <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{subscription.plan} subscription</span>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-6">
          <NavButton icon={<LayoutDashboard size={20} />} label="Command Center" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <NavButton icon={<Zap size={20} />} label="Speed Agent" active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} />
          <NavButton icon={<Users size={20} />} label="Lead Intelligence" active={activeTab === 'leads'} onClick={() => setActiveTab('leads')} />
          <NavButton icon={<FileText size={20} />} label="Document Extraction" active={activeTab === 'documents'} onClick={() => setActiveTab('documents')} />
          <NavButton icon={<ShieldCheck size={20} />} label="Partner Activity" active={activeTab === 'partners'} onClick={() => setActiveTab('partners')} />
        </nav>

        <div className="p-6 space-y-4 bg-slate-900/40 border-t border-slate-800/50">
          <button 
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === 'settings' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-white'
            }`}
          >
            <MoreHorizontal size={18} />
            System Settings
          </button>
          
          <div className="flex items-center gap-4 bg-slate-800/30 p-3 rounded-2xl border border-slate-800/50">
            <img src={user.avatar} className="w-10 h-10 rounded-xl bg-slate-700 border border-white/10" alt="Avatar" />
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm truncate leading-tight">{user.name}</p>
              <p className="text-[10px] text-slate-500 truncate font-black uppercase tracking-widest mt-0.5">{user.role}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN VIEWPORT */}
      <main className="flex-1 overflow-hidden relative z-0 flex flex-col">
        <div className="flex-1 overflow-hidden relative">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'chat' && <SpeedAgent />}
          {activeTab === 'leads' && <Leads />}
          {activeTab === 'documents' && <Documents />}
          {activeTab === 'partners' && <PartnerActivityDashboard />}
          {activeTab === 'settings' && <Settings />}
        </div>
      </main>
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AgentProvider>
        <AppContent />
      </AgentProvider>
    </ErrorBoundary>
  );
}

function NavButton({ icon, label, active, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-300 group ${
        active 
          ? 'bg-blue-600 text-white shadow-[0_10px_30px_rgba(37,99,235,0.3)] translate-x-1' 
          : 'text-slate-500 hover:bg-slate-800 hover:text-slate-200 hover:translate-x-1'
      }`}
    >
      <span className={`transition-colors duration-300 ${active ? 'text-white' : 'text-slate-600 group-hover:text-slate-300'}`}>
        {icon}
      </span>
      {label}
    </button>
  );
}
