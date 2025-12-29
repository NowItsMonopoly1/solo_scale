import React, { useEffect, useState } from 'react';
import { APIService, Lead } from '../../services/apiService';

/**
 * Exception-Only View
 *
 * Design Principles:
 * - Only show leads that REQUIRE human decision
 * - Large, high-contrast action buttons
 * - Clear risk indicators (RED = High, AMBER = Medium)
 * - Hide routine/automated items
 */

interface Exception {
  type: 'name_mismatch' | 'missing_critical_doc' | 'high_risk' | 'stalled';
  severity: 'high' | 'medium' | 'low';
  lead: Lead;
  reason: string;
  suggestedAction: string;
}

export const ExceptionView: React.FC = () => {
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBroker, setSelectedBroker] = useState<string | null>(null);

  useEffect(() => {
    loadExceptions();
  }, []);

  const loadExceptions = async () => {
    try {
      setLoading(true);
      const { leads } = await APIService.getLeads({
        status: 'in_progress',
        sort: 'retirement_priority',
        order: 'desc'
      });

      // Filter to ONLY exceptions (leads needing human decisions)
      const foundExceptions: Exception[] = [];

      leads.forEach((lead) => {
        // Exception 1: Stalled leads (no activity in 15+ minutes)
        if (lead.chasers_pending && lead.chasers_pending > 0) {
          foundExceptions.push({
            type: 'stalled',
            severity: 'high',
            lead,
            reason: `No response after ${lead.chasers_sent} chasers sent`,
            suggestedAction: 'Call directly or reassign'
          });
        }

        // Exception 2: High-priority retirement leads
        if (lead.retirement_priority_score >= 80) {
          foundExceptions.push({
            type: 'high_risk',
            severity: 'high',
            lead,
            reason: 'High retirement priority - broker phasing out',
            suggestedAction: 'Fast-track or assign to senior partner'
          });
        }

        // Exception 3: Missing critical documents (if chaser count > 3)
        if (lead.chasers_sent && lead.chasers_sent >= 3) {
          foundExceptions.push({
            type: 'missing_critical_doc',
            severity: 'medium',
            lead,
            reason: 'Borrower not responding to document requests',
            suggestedAction: 'Escalate to phone call'
          });
        }
      });

      setExceptions(foundExceptions);
    } catch (error) {
      console.error('Failed to load exceptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (leadId: string) => {
    try {
      await APIService.updateLead(leadId, { status: 'qualified' });
      loadExceptions(); // Refresh
    } catch (error) {
      console.error('Approval failed:', error);
    }
  };

  const handleReassign = async (leadId: string) => {
    // Get list of brokers for reassignment
    const targetUserId = selectedBroker || prompt('Enter broker ID to reassign to:');
    if (!targetUserId) return;

    try {
      await fetch(`/api/partners/reassignment/${leadId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          target_user_id: targetUserId,
          reason: 'Manual reassignment from exception view'
        })
      });
      loadExceptions(); // Refresh
    } catch (error) {
      console.error('Reassignment failed:', error);
    }
  };

  const handleCall = (lead: Lead) => {
    if (lead.phone) {
      window.open(`tel:${lead.phone}`, '_self');
    } else {
      alert('No phone number available for this lead');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-xl text-gray-600">Loading exceptions...</div>
      </div>
    );
  }

  // No exceptions = Success message
  if (exceptions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-green-50 border-2 border-green-500 rounded-lg p-12 text-center">
            <svg className="w-24 h-24 text-green-600 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h1 className="text-4xl font-bold text-green-900 mb-4">
              All Clear! ✨
            </h1>
            <p className="text-xl text-green-800 mb-2">
              No exceptions requiring your attention right now.
            </p>
            <p className="text-green-700">
              The system is handling routine tasks automatically. You can relax or focus on growth activities.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Exception Dashboard
        </h1>
        <p className="text-lg text-gray-600">
          {exceptions.length} {exceptions.length === 1 ? 'lead' : 'leads'} requiring your decision
        </p>
      </div>

      {/* Exception Cards */}
      <div className="space-y-6">
        {exceptions.map((exception, idx) => {
          const severityColors = {
            high: 'bg-red-50 border-red-500',
            medium: 'bg-amber-50 border-amber-500',
            low: 'bg-blue-50 border-blue-500'
          };

          const severityBadges = {
            high: 'bg-red-100 text-red-800',
            medium: 'bg-amber-100 text-amber-800',
            low: 'bg-blue-100 text-blue-800'
          };

          return (
            <div
              key={`${exception.lead.id}-${idx}`}
              className={`${severityColors[exception.severity]} border-2 rounded-lg p-8 shadow-lg`}
            >
              {/* Header with Status Badge */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <span className={`px-4 py-2 rounded-full text-sm font-bold ${severityBadges[exception.severity]}`}>
                    {exception.severity.toUpperCase()} PRIORITY
                  </span>
                  <span className="text-gray-600 text-sm">
                    {exception.type.replace(/_/g, ' ').toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Lead Information */}
              <div className="mb-6">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  {exception.lead.name}
                </h2>
                <div className="grid grid-cols-2 gap-4 text-gray-700">
                  <div>
                    <span className="text-sm text-gray-600">Email:</span>
                    <p className="font-medium">{exception.lead.email}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Phone:</span>
                    <p className="font-medium">{exception.lead.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Loan Amount:</span>
                    <p className="font-medium">
                      ${exception.lead.loan_amount?.toLocaleString() || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Credit Tier:</span>
                    <p className="font-medium capitalize">
                      {exception.lead.credit_tier || 'Unknown'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Exception Details */}
              <div className="bg-white rounded-lg p-6 mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  Why This Needs Your Attention:
                </h3>
                <p className="text-gray-800 mb-4">{exception.reason}</p>

                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  Suggested Action:
                </h3>
                <p className="text-blue-700 font-medium">{exception.suggestedAction}</p>
              </div>

              {/* Large Action Buttons */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => handleApprove(exception.lead.id)}
                  className="px-8 py-6 bg-green-600 hover:bg-green-700 text-white text-xl font-bold rounded-lg shadow-lg transition-all transform hover:scale-105 flex items-center justify-center gap-3"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  APPROVE
                </button>

                <button
                  onClick={() => handleReassign(exception.lead.id)}
                  className="px-8 py-6 bg-blue-600 hover:bg-blue-700 text-white text-xl font-bold rounded-lg shadow-lg transition-all transform hover:scale-105 flex items-center justify-center gap-3"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  REASSIGN
                </button>

                <button
                  onClick={() => handleCall(exception.lead)}
                  className="px-8 py-6 bg-orange-600 hover:bg-orange-700 text-white text-xl font-bold rounded-lg shadow-lg transition-all transform hover:scale-105 flex items-center justify-center gap-3"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  CALL NOW
                </button>
              </div>

              {/* Activity Stats */}
              <div className="mt-6 pt-6 border-t border-gray-300">
                <div className="flex gap-6 text-sm text-gray-600">
                  <span>📧 Chasers Sent: <strong>{exception.lead.chasers_sent || 0}</strong></span>
                  <span>⏳ Pending: <strong>{exception.lead.chasers_pending || 0}</strong></span>
                  <span>💬 Messages: <strong>{exception.lead.total_messages || 0}</strong></span>
                  <span>🎯 Priority Score: <strong>{exception.lead.retirement_priority_score}/100</strong></span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Footer */}
      <div className="mt-12 bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600 mb-1">Showing exceptions only</p>
            <p className="text-sm text-gray-500">
              Routine tasks are being handled automatically by the AI system
            </p>
          </div>
          <button
            onClick={loadExceptions}
            className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
};
