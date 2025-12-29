
import React, { useState, useEffect } from 'react';
import { useAgent } from '../contexts/AgentContext';
import { Save, Clock, Zap, MessageSquare, Shield, CheckCircle, Globe, CreditCard, Trash2, LogOut } from 'lucide-react';
import { SpeedAgentConfig } from '../types';

export const Settings: React.FC = () => {
  const { config, updateConfig, subscription, user, logout, clearHistory } = useAgent();
  const [formData, setFormData] = useState<SpeedAgentConfig>(config);
  const [activeSection, setActiveSection] = useState<'agent' | 'billing' | 'advanced'>('agent');
  const [isDirty, setIsDirty] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    setFormData(config);
  }, [config]);

  const handleChange = (field: keyof SpeedAgentConfig, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleKeywordChange = (category: keyof SpeedAgentConfig['urgencyKeywords'], value: string) => {
    const arrayValues = value.split(',').map(s => s.trim()).filter(s => s.length > 0);
    setFormData(prev => ({
      ...prev,
      urgencyKeywords: { ...prev.urgencyKeywords, [category]: arrayValues }
    }));
    setIsDirty(true);
  };

  const handleOfficeHoursChange = (field: keyof SpeedAgentConfig['officeHours'], value: any) => {
    setFormData(prev => ({
      ...prev,
      officeHours: { ...prev.officeHours, [field]: value }
    }));
    setIsDirty(true);
  };

  const handleSave = () => {
    updateConfig({ ...config, ...formData });
    setIsDirty(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between shadow-sm sticky top-0 z-20">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Workspace Settings</h1>
          <div className="flex items-center gap-2 mt-1">
             <span className="text-xs text-slate-400 font-medium">{user?.email}</span>
             <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
             <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">{subscription.plan} Account</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={!isDirty}
            className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
              isDirty
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 hover:bg-blue-700'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
            }`}
          >
            {showSuccess ? <CheckCircle size={18} /> : <Save size={18} />}
            <span>{showSuccess ? 'Config Saved' : 'Save Changes'}</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Settings Navigation */}
        <aside className="w-64 bg-white border-r border-slate-200 p-6 space-y-2">
          <TabButton active={activeSection === 'agent'} onClick={() => setActiveSection('agent')} icon={<Zap size={18}/>} label="Agent Intelligence" />
          <TabButton active={activeSection === 'billing'} onClick={() => setActiveSection('billing')} icon={<CreditCard size={18}/>} label="Billing & Usage" />
          <TabButton active={activeSection === 'advanced'} onClick={() => setActiveSection('advanced')} icon={<Shield size={18}/>} label="Data & Security" />
          <div className="pt-8 mt-8 border-t border-slate-100">
            <button 
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-3 text-rose-500 font-bold text-sm hover:bg-rose-50 rounded-xl transition-colors"
            >
              <LogOut size={18} />
              Sign Out
            </button>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-3xl space-y-8">
            {activeSection === 'agent' && (
              <>
                <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <h2 className="font-bold text-slate-800 text-sm uppercase tracking-widest">Model Orchestration</h2>
                    <span className="text-[10px] font-black bg-blue-100 text-blue-600 px-2 py-0.5 rounded uppercase">Enterprise v1.2</span>
                  </div>
                  <div className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Speed Engine</label>
                        <select 
                          value={formData.model}
                          onChange={(e) => handleChange('model', e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 bg-slate-50 focus:border-blue-500 focus:bg-white text-sm font-bold"
                        >
                          <option value="gemini-3-flash-preview">Gemini 3 Flash</option>
                          <option value="gemini-3-pro-preview">Gemini 3 Pro</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Status</label>
                        <button
                          onClick={() => handleChange('active', !formData.active)}
                          className={`w-full py-3 rounded-xl font-black text-xs border-2 transition-all ${
                            formData.active ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'
                          }`}
                        >
                          {formData.active ? 'ORCHESTRATOR ONLINE' : 'ORCHESTRATOR PAUSED'}
                        </button>
                      </div>
                    </div>

                    <div className={`p-5 rounded-2xl border-2 transition-all flex items-center justify-between ${formData.enableRealTimeSearch ? 'bg-blue-50/50 border-blue-100' : 'bg-slate-50 border-slate-100'}`}>
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${formData.enableRealTimeSearch ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-200 text-slate-400'}`}>
                          <Globe size={20} />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 leading-none">Market Search Grounding</h3>
                          <p className="text-xs text-slate-500 mt-2 font-medium">Inject live market data into agent responses.</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleChange('enableRealTimeSearch', !formData.enableRealTimeSearch)}
                        className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors ${formData.enableRealTimeSearch ? 'bg-blue-600' : 'bg-slate-200'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.enableRealTimeSearch ? 'translate-x-7' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  </div>
                </section>

                <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
                  <h2 className="font-bold text-slate-800 text-sm uppercase tracking-widest border-b border-slate-50 pb-4">Lifestyle & Office Hours</h2>
                  <div className="space-y-4">
                     <div className="flex items-center justify-between">
                        <div>
                           <p className="text-sm font-bold text-slate-900">Enforce Availability</p>
                           <p className="text-xs text-slate-500 font-medium">Mute agent output during non-business hours.</p>
                        </div>
                        <button 
                          onClick={() => handleOfficeHoursChange('enabled', !formData.officeHours.enabled)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.officeHours.enabled ? 'bg-blue-600' : 'bg-slate-200'}`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.officeHours.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                     </div>
                  </div>
                </section>
              </>
            )}

            {activeSection === 'billing' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-12 opacity-10">
                    <CreditCard size={180} />
                  </div>
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-10">
                       <div>
                         <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-500/30">Active Subscription</span>
                         <h2 className="text-4xl font-black mt-4 tracking-tighter capitalize">{subscription.plan} Intelligence</h2>
                       </div>
                       <div className="text-right">
                         <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Monthly Cost</p>
                         <p className="text-3xl font-black">$199<span className="text-sm text-slate-500">/mo</span></p>
                       </div>
                    </div>
                    <div className="flex items-center gap-12">
                       <div className="space-y-2">
                         <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Billing Period</p>
                         <p className="text-sm font-bold">{new Date(subscription.renewsAt).toLocaleDateString()}</p>
                       </div>
                       <div className="space-y-2">
                         <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Payment Method</p>
                         <p className="text-sm font-bold flex items-center gap-2">
                            <span className="w-8 h-5 bg-slate-800 rounded border border-slate-700 flex items-center justify-center text-[10px] font-black">VISA</span>
                            •••• 4242
                         </p>
                       </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-8">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">Usage Ledger</h3>
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between text-xs font-bold mb-3">
                         <span className="text-slate-500">Intelligence Token Usage</span>
                         <span className="text-slate-900">{subscription.currentUsage} / {subscription.usageLimit}</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                         <div className="h-full bg-blue-600 rounded-full transition-all duration-1000" style={{ width: `${(subscription.currentUsage / subscription.usageLimit) * 100}%` }} />
                      </div>
                    </div>
                    <button className="w-full py-4 border-2 border-slate-100 rounded-2xl text-xs font-black text-slate-600 uppercase tracking-widest hover:bg-slate-50 transition-colors">
                      Increase Quota / Add Credits
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'advanced' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white rounded-2xl border border-rose-100 p-8 space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-rose-50 text-rose-500 rounded-xl">
                      <Trash2 size={24} />
                    </div>
                    <div>
                       <h3 className="text-sm font-bold text-slate-900">Clear Data Persistence</h3>
                       <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                         Wipe all locally stored leads, chat history, and intelligence metadata. This action cannot be undone.
                       </p>
                       <button 
                        onClick={() => { if(confirm('Wipe local database?')) clearHistory() }}
                        className="mt-6 px-5 py-2.5 bg-rose-50 text-rose-600 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-rose-100 transition-colors"
                       >
                         Nuke Intelligence Database
                       </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

const TabButton = ({ active, onClick, icon, label }: any) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${
      active 
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
        : 'text-slate-500 hover:bg-slate-50'
    }`}
  >
    {icon}
    {label}
  </button>
);
