import React, { useState, useEffect } from 'react';
import { History, MessageSquare, X, CheckCircle, Clock } from 'lucide-react';

interface Conversation {
  id: string;
  subject?: string;
  status: 'active' | 'closed' | 'archived';
  ai_summary?: string;
  message_count: number;
  last_message_at?: string;
  closed_at?: string;
  created_at: string;
}

interface ConversationHistoryProps {
  accountId: string;
  leadId?: string;
}

export function ConversationHistory({ accountId, leadId }: ConversationHistoryProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);

  useEffect(() => {
    fetchHistory();
  }, [accountId, leadId]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        status: 'closed',
        ...(leadId && { lead_id: leadId })
      });

      const response = await fetch(
        `/api/accounts/${accountId}/conversations?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error('Failed to fetch conversation history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
        <History className="w-5 h-5 text-slate-400" />
        <h3 className="font-bold text-slate-900">Conversation History</h3>
        <span className="ml-auto text-xs font-bold text-slate-400 uppercase tracking-wider">
          {conversations.length} Closed
        </span>
      </div>

      {/* Conversation List */}
      <div className="divide-y divide-slate-100">
        {conversations.length === 0 ? (
          <div className="px-6 py-12 text-center text-slate-400">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">No conversation history yet</p>
          </div>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              className="px-6 py-4 hover:bg-slate-50 cursor-pointer transition-colors"
              onClick={() => setSelectedConv(conv)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-bold text-slate-900 truncate">
                      {conv.subject || 'Conversation'}
                    </h4>
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                      <CheckCircle className="w-3 h-3" />
                      Closed
                    </span>
                  </div>

                  {conv.ai_summary && (
                    <p className="text-sm text-slate-600 line-clamp-2 mb-2">
                      {conv.ai_summary}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-[11px] text-slate-400 font-medium">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      {conv.message_count} messages
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(conv.closed_at)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Conversation Detail Modal */}
      {selectedConv && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900">
                  {selectedConv.subject || 'Conversation Details'}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Closed {formatDate(selectedConv.closed_at)}
                </p>
              </div>
              <button
                onClick={() => setSelectedConv(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-4 overflow-y-auto max-h-[60vh]">
              {selectedConv.ai_summary && (
                <div className="mb-6">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                    AI Summary
                  </h4>
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                    <p className="text-sm text-slate-700 leading-relaxed">
                      {selectedConv.ai_summary}
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                  Details
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500 font-medium">Messages</span>
                    <p className="text-slate-900 font-bold">{selectedConv.message_count}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Last Activity</span>
                    <p className="text-slate-900 font-bold">
                      {formatDate(selectedConv.last_message_at)}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Created</span>
                    <p className="text-slate-900 font-bold">
                      {formatDate(selectedConv.created_at)}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Status</span>
                    <p className="text-slate-900 font-bold capitalize">{selectedConv.status}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
