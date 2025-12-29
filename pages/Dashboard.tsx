import React, { useState, useEffect } from 'react';
import { useAgent } from '../contexts/AgentContext';
import {
  CheckCircle, AlertTriangle, TrendingUp, Zap, Bot,
  MessageSquare, FileText, User, Phone, Mail, Clock, ArrowUpRight
} from 'lucide-react';

interface AutomatedAction {
  id: string;
  type: 'document_processed' | 'chaser_sent' | 'lead_analyzed';
  timestamp: Date;
  summary: string;
  metadata: any;
}

interface ActionRequired {
  id: string;
  type: 'high_discrepancy' | 'manual_review' | 'client_escalation';
  severity: 'high' | 'medium';
  title: string;
  description: string;
  leadId?: string;
  timestamp: Date;
}

export function Dashboard() {
  const { leads, isProcessing, subscription } = useAgent();

  // HIGH-VALUE LEADS: Urgency > 90, ready for broker call
  const highValueLeads = leads
    .filter(l => (l.urgencyScore || 0) > 90)
    .sort((a, b) => (b.urgencyScore || 0) - (a.urgencyScore || 0))
    .slice(0, 10);

  // SIMULATED DATA (replace with real backend calls in production)
  const [automatedActions] = useState<AutomatedAction[]>([
    {
      id: '1',
      type: 'document_processed',
      timestamp: new Date(Date.now() - 15 * 60000),
      summary: 'Paystub processed for John Doe - 95% confidence',
      metadata: { documentType: 'Paystub', confidence: 95 }
    },
    {
      id: '2',
      type: 'chaser_sent',
      timestamp: new Date(Date.now() - 32 * 60000),
      summary: 'SMS chaser sent: Missing YTD on paystub for Jane Smith',
      metadata: { channel: 'sms', recipient: 'Jane Smith' }
    },
    {
      id: '3',
      type: 'lead_analyzed',
      timestamp: new Date(Date.now() - 48 * 60000),
      summary: '3 new leads scored and prioritized',
      metadata: { count: 3, averageScore: 82 }
    }
  ]);

  const [actionsRequired] = useState<ActionRequired[]>([
    {
      id: '1',
      type: 'high_discrepancy',
      severity: 'high',
      title: 'Name Mismatch on W-2',
      description: 'W-2 shows "Robert Johnson" but application has "Bob Johnson"',
      leadId: 'lead_xyz123',
      timestamp: new Date(Date.now() - 25 * 60000)
    },
    {
      id: '2',
      type: 'manual_review',
      severity: 'medium',
      title: 'Low Confidence Extraction',
      description: 'Bank statement extracted at 68% confidence - verify balances',
      leadId: 'lead_abc456',
      timestamp: new Date(Date.now() - 55 * 60000)
    }
  ]);

  const usagePercentage = (subscription.currentUsage / subscription.usageLimit) * 100;

  return (
    <div className="p-8 bg-slate-50 h-full overflow-y-auto">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Strategic Oversight</h1>
            <p className="text-slate-500 mt-1 font-medium flex items-center gap-2">
              Exception-Only Dashboard
              <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
              <span className="text-emerald-600 flex items-center gap-1">
                <Bot className="w-3 h-3" />
                AI Workforce Active
              </span>
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Credits: {subscription.usageLimit - subscription.currentUsage} / {subscription.usageLimit}
            </div>
            <div className="w-48 h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 ${usagePercentage > 90 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                style={{ width: `${usagePercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <StatCard
            icon={<CheckCircle className="w-5 h-5 text-emerald-600" />}
            label="Handled by AI Today"
            value={automatedActions.length.toString()}
            bgColor="bg-emerald-50"
          />
          <StatCard
            icon={<AlertTriangle className="w-5 h-5 text-amber-600" />}
            label="Needs Your Attention"
            value={actionsRequired.length.toString()}
            bgColor="bg-amber-50"
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5 text-blue-600" />}
            label="High-Value Ready"
            value={highValueLeads.length.toString()}
            bgColor="bg-blue-50"
          />
          <StatCard
            icon={<Zap className="w-5 h-5 text-purple-600" />}
            label="Active Workflows"
            value={isProcessing ? '1' : '0'}
            bgColor="bg-purple-50"
          />
        </div>
      </header>

      {/* 3-COLUMN EXCEPTION DASHBOARD */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* COLUMN 1: HANDLED BY AI */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-emerald-50 border-b border-emerald-100 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Bot className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="font-black text-emerald-900">Handled by AI</h2>
                <p className="text-xs text-emerald-600 font-medium">Zero touch automation</p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {automatedActions.length === 0 ? (
              <div className="p-12 text-center">
                <CheckCircle className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">No automated actions yet</p>
              </div>
            ) : (
              automatedActions.map(action => (
                <div key={action.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-emerald-100 rounded-lg flex-shrink-0">
                      {action.type === 'document_processed' && <FileText className="w-4 h-4 text-emerald-600" />}
                      {action.type === 'chaser_sent' && <MessageSquare className="w-4 h-4 text-emerald-600" />}
                      {action.type === 'lead_analyzed' && <TrendingUp className="w-4 h-4 text-emerald-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 leading-snug">
                        {action.summary}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span className="text-xs text-slate-500">
                          {formatTimeAgo(action.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="bg-slate-50 border-t border-slate-200 p-4">
            <button className="w-full text-xs font-bold text-slate-600 hover:text-emerald-600 transition-colors flex items-center justify-center gap-1">
              View Full Activity Log
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* COLUMN 2: ACTION REQUIRED */}
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
          <div className="bg-amber-50 border-b border-amber-100 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h2 className="font-black text-amber-900">Action Required</h2>
                <p className="text-xs text-amber-600 font-medium">AI escalations & flags</p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {actionsRequired.length === 0 ? (
              <div className="p-12 text-center">
                <CheckCircle className="w-12 h-12 text-emerald-200 mx-auto mb-3" />
                <p className="text-slate-400 text-sm font-bold">All Clear!</p>
                <p className="text-slate-300 text-xs mt-1">No exceptions detected</p>
              </div>
            ) : (
              actionsRequired.map(action => (
                <div
                  key={action.id}
                  className={`p-4 hover:bg-amber-50 transition-colors border-l-4 ${
                    action.severity === 'high' ? 'border-l-red-500' : 'border-l-amber-500'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                        action.severity === 'high'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {action.severity}
                      </span>
                      <span className="text-xs text-slate-500">
                        {formatTimeAgo(action.timestamp)}
                      </span>
                    </div>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm mb-1">
                    {action.title}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed mb-3">
                    {action.description}
                  </p>

                  <div className="flex gap-2">
                    <button className="flex-1 px-3 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors">
                      Review Now
                    </button>
                    <button className="px-3 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-200 transition-colors">
                      Snooze
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* COLUMN 3: HIGH-VALUE LEADS */}
        <div className="bg-white rounded-2xl border border-blue-200 shadow-sm overflow-hidden">
          <div className="bg-blue-50 border-b border-blue-100 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="font-black text-blue-900">High-Value Leads</h2>
                <p className="text-xs text-blue-600 font-medium">Urgency score &gt; 90</p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {highValueLeads.length === 0 ? (
              <div className="p-12 text-center">
                <TrendingUp className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">No high-urgency leads</p>
                <p className="text-slate-300 text-xs mt-1">AI is monitoring pipeline</p>
              </div>
            ) : (
              highValueLeads.map(lead => (
                <div key={lead.id} className="p-4 hover:bg-blue-50 transition-colors group cursor-pointer">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <User className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">
                          Lead #{lead.id.slice(0, 6)}
                        </p>
                        <span className="text-xs text-slate-500">{lead.rawSource}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-blue-600 font-black text-lg">
                        {lead.urgencyScore}
                        <Zap className="w-3 h-3 fill-current" />
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Score</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 italic leading-relaxed mb-3">
                    "{lead.analysis}"
                  </p>

                  <div className="flex gap-2">
                    <button className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors">
                      <Phone className="w-3 h-3" />
                      Call Now
                    </button>
                    <button className="px-3 py-2 bg-blue-100 text-blue-700 text-xs font-bold rounded-lg hover:bg-blue-200 transition-colors">
                      <Mail className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="bg-slate-50 border-t border-slate-200 p-4">
            <button className="w-full text-xs font-bold text-slate-600 hover:text-blue-600 transition-colors flex items-center justify-center gap-1">
              View All Leads
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* RETIREMENT METRICS */}
      <div className="mt-8 bg-gradient-to-br from-emerald-50 to-blue-50 border border-emerald-200 rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-900 mb-1">
              🎯 Broker "Retirement" Progress
            </h3>
            <p className="text-sm text-slate-600">
              Time saved by AI automation this week
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black text-emerald-600">6.5 hrs</div>
            <p className="text-xs text-slate-500 font-bold">Target: 7.5 hrs/week</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <p className="text-xs text-slate-500 font-bold mb-1">Documents Auto-Processed</p>
            <p className="text-2xl font-black text-slate-900">12</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <p className="text-xs text-slate-500 font-bold mb-1">Chasers Sent</p>
            <p className="text-2xl font-black text-slate-900">8</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <p className="text-xs text-slate-500 font-bold mb-1">Leads Scored</p>
            <p className="text-2xl font-black text-slate-900">24</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, bgColor }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  bgColor: string;
}) {
  return (
    <div className={`${bgColor} rounded-xl p-4 border border-slate-200`}>
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <p className="text-xs text-slate-600 font-bold">{label}</p>
          <p className="text-2xl font-black text-slate-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
