import React from 'react';
import { LayoutDashboard, Zap, Settings, MessageSquare, Users } from 'lucide-react';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Command Center', icon: LayoutDashboard },
    { id: 'speed-agent', label: 'Speed Agent', icon: Zap, active: true },
    { id: 'leads', label: 'Lead Pool', icon: Users },
    { id: 'chat', label: 'Live Chats', icon: MessageSquare },
  ];

  return (
    <div className="w-64 h-screen bg-slate-900 text-white flex flex-col border-r border-slate-800 flex-shrink-0">
      <div className="p-6">
        <h1 className="text-2xl font-bold tracking-tight text-blue-400">SoloScale<span className="text-white">.ai</span></h1>
        <p className="text-xs text-slate-400 mt-1">Enterprise Grade • v1.0</p>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon size={20} />
              <span className="font-medium">{item.label}</span>
              {item.id === 'speed-agent' && (
                <span className="ml-auto w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button 
          onClick={() => onNavigate('settings')}
          className="w-full flex items-center space-x-3 px-4 py-3 text-slate-400 hover:text-white transition-colors hover:bg-slate-800 rounded-lg"
        >
          <Settings size={20} />
          <span>Configuration</span>
        </button>
      </div>
    </div>
  );
};