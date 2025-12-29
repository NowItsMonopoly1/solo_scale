import React from 'react';
import { Activity, Power, AlertCircle } from 'lucide-react';
import { AgentState } from '../types';

interface AgentCardProps {
  agent: AgentState;
}

export const AgentCard: React.FC<AgentCardProps> = ({ agent }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-500';
      case 'idle': return 'bg-amber-500';
      case 'error': return 'bg-rose-500';
      default: return 'bg-slate-400';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-semibold text-slate-900">{agent.name}</h3>
          <p className="text-sm text-slate-500">{agent.role}</p>
        </div>
        <div className={`h-2.5 w-2.5 rounded-full ${getStatusColor(agent.status)} animate-pulse`} />
      </div>

      <div className="grid grid-cols-2 gap-4 mt-6">
        <div className="bg-slate-50 p-3 rounded-lg">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <Activity size={14} />
            <span className="text-xs font-medium uppercase tracking-wider">Processed</span>
          </div>
          <p className="text-2xl font-bold text-slate-700">{agent.tasksCompleted}</p>
        </div>
        <div className="bg-slate-50 p-3 rounded-lg">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <Power size={14} />
            <span className="text-xs font-medium uppercase tracking-wider">Status</span>
          </div>
          <p className="text-sm font-semibold text-slate-700 capitalize">{agent.status}</p>
        </div>
      </div>
    </div>
  );
};