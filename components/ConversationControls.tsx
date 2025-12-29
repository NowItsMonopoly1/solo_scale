import React, { useState } from 'react';
import { X, CheckCircle, AlertCircle, History } from 'lucide-react';

interface ConversationControlsProps {
  conversationId?: string;
  accountId: string;
  onClose?: () => void;
  onViewHistory?: () => void;
}

export function ConversationControls({
  conversationId,
  accountId,
  onClose,
  onViewHistory,
}: ConversationControlsProps) {
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [closeReason, setCloseReason] = useState('');
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState('');

  const handleCloseConversation = async () => {
    if (!conversationId) return;

    setClosing(true);
    setError('');

    try {
      const response = await fetch(
        `/api/conversations/${conversationId}/close?accountId=${accountId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({
            close_reason: closeReason || undefined,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to close conversation');
      }

      const result = await response.json();
      console.log('Conversation closed:', result);

      // Show success message
      alert(
        `Conversation closed successfully!\n\nAI Summary:\n${result.ai_summary || 'No summary generated'}`
      );

      setShowCloseDialog(false);
      setCloseReason('');
      onClose?.();
    } catch (err: any) {
      console.error('Error closing conversation:', err);
      setError(err.message || 'Failed to close conversation');
    } finally {
      setClosing(false);
    }
  };

  return (
    <>
      {/* Control Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={onViewHistory}
          className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-bold transition-colors"
        >
          <History className="w-4 h-4" />
          <span>History</span>
        </button>

        {conversationId && (
          <button
            onClick={() => setShowCloseDialog(true)}
            className="flex items-center gap-2 px-3 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg text-sm font-bold transition-colors"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Close Conversation</span>
          </button>
        )}
      </div>

      {/* Close Conversation Dialog */}
      {showCloseDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
            {/* Dialog Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                </div>
                <h3 className="font-bold text-slate-900">Close Conversation</h3>
              </div>
              <button
                onClick={() => setShowCloseDialog(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                disabled={closing}
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Dialog Body */}
            <div className="px-6 py-4">
              <p className="text-sm text-slate-600 mb-4">
                Closing this conversation will generate an AI-powered summary and mark it as
                complete. You can still view it in the conversation history.
              </p>

              <label className="block mb-2">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                  Reason (Optional)
                </span>
                <textarea
                  value={closeReason}
                  onChange={(e) => setCloseReason(e.target.value)}
                  placeholder="E.g., Lead converted, No longer interested, etc."
                  className="mt-2 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm resize-none"
                  rows={3}
                  disabled={closing}
                />
              </label>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700 mb-4">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* Dialog Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 rounded-b-2xl">
              <button
                onClick={() => setShowCloseDialog(false)}
                className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg font-bold text-sm transition-colors"
                disabled={closing}
              >
                Cancel
              </button>
              <button
                onClick={handleCloseConversation}
                disabled={closing}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm transition-colors flex items-center gap-2"
              >
                {closing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    <span>Closing...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Close & Generate Summary</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
