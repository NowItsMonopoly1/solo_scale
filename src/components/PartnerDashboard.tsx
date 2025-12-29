import React, { useEffect, useState } from 'react';
import { APIService } from '../../services/apiService';

/**
 * Partner Activity Dashboard
 *
 * Design Principles:
 * - Large, high-contrast action buttons
 * - Visual charts (bar/pie) over data tables
 * - Technical details collapsed by default
 * - Exception-only view for quick decisions
 */

interface TeamOverview {
  senior_partner_id: string;
  senior_partner_name: string;
  total_junior_brokers: number;
  total_team_leads: number;
  new_leads: number;
  in_progress_leads: number;
  leads_assigned_to_senior: number;
  reassigned_leads: number;
}

interface Broker {
  id: string;
  name: string;
  email: string;
  total_leads: number;
  active_leads: number;
  closed_leads: number;
  last_activity_at?: string;
}

interface LeadNeedingAttention {
  id: string;
  name: string;
  assigned_user_name: string;
  minutes_since_assignment: number;
  status: string;
  retirement_priority_score: number;
}

export const PartnerDashboard: React.FC = () => {
  const [overview, setOverview] = useState<TeamOverview | null>(null);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [needsAttention, setNeedsAttention] = useState<LeadNeedingAttention[]>([]);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch team overview
      const overviewData = await fetch('/api/partners/team/overview', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      }).then(r => r.json());
      setOverview(overviewData);

      // Fetch junior brokers
      const brokersData = await fetch('/api/partners/team/brokers', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      }).then(r => r.json());
      setBrokers(brokersData.brokers || []);

      // Fetch leads needing reassignment
      const attentionData = await fetch('/api/partners/reassignment/pending', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      }).then(r => r.json());
      setNeedsAttention(attentionData.leads || []);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReassign = async (leadId: string, targetUserId: string) => {
    try {
      await fetch(`/api/partners/reassignment/${leadId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          target_user_id: targetUserId,
          reason: 'Manual reassignment from senior partner dashboard'
        })
      });
      loadDashboardData(); // Refresh
    } catch (error) {
      console.error('Reassignment failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-xl text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Strategic Oversight
        </h1>
        <p className="text-lg text-gray-600">
          Welcome back, {overview?.senior_partner_name}
        </p>
      </div>

      {/* Exception-Only View: Leads Needing Your Attention */}
      {needsAttention.length > 0 && (
        <div className="bg-red-50 border-2 border-red-500 rounded-lg p-6 mb-8">
          <div className="flex items-center mb-4">
            <svg className="w-8 h-8 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="text-2xl font-bold text-red-900">
              Needs Your Attention ({needsAttention.length})
            </h2>
          </div>

          {needsAttention.map((lead) => (
            <div key={lead.id} className="bg-white rounded-lg p-6 mb-4 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <span className="text-xl font-bold text-gray-900 mr-4">
                      {lead.name}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      lead.retirement_priority_score >= 80 ? 'bg-red-100 text-red-800' :
                      lead.retirement_priority_score >= 60 ? 'bg-amber-100 text-amber-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {lead.retirement_priority_score >= 80 ? 'HIGH' :
                       lead.retirement_priority_score >= 60 ? 'MEDIUM' : 'LOW'} PRIORITY
                    </span>
                  </div>
                  <p className="text-gray-600">
                    Assigned to: <span className="font-semibold">{lead.assigned_user_name}</span>
                  </p>
                  <p className="text-red-600 font-medium mt-1">
                    ⏰ No activity for {Math.floor(lead.minutes_since_assignment)} minutes
                  </p>
                </div>

                {/* Large Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => handleReassign(lead.id, overview?.senior_partner_id || '')}
                    className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold rounded-lg shadow-lg transition-colors"
                  >
                    TAKE OVER
                  </button>
                  <button
                    onClick={() => window.open(`tel:${lead.name}`, '_self')}
                    className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white text-lg font-bold rounded-lg shadow-lg transition-colors flex items-center gap-2"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    CALL NOW
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Team Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-gray-600 text-sm mb-1">Team Size</p>
          <p className="text-4xl font-bold text-gray-900">{overview?.total_junior_brokers || 0}</p>
          <p className="text-gray-500 text-sm mt-1">Junior Brokers</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-gray-600 text-sm mb-1">Total Leads</p>
          <p className="text-4xl font-bold text-blue-600">{overview?.total_team_leads || 0}</p>
          <p className="text-gray-500 text-sm mt-1">Across All Team</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-gray-600 text-sm mb-1">New Leads</p>
          <p className="text-4xl font-bold text-green-600">{overview?.new_leads || 0}</p>
          <p className="text-gray-500 text-sm mt-1">Need Assignment</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-gray-600 text-sm mb-1">Reassigned</p>
          <p className="text-4xl font-bold text-amber-600">{overview?.reassigned_leads || 0}</p>
          <p className="text-gray-500 text-sm mt-1">Back to You</p>
        </div>
      </div>

      {/* Partner Performance Chart */}
      <div className="bg-white rounded-lg shadow-md p-8 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Partner Performance</h2>

        {brokers.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No junior brokers assigned yet</p>
        ) : (
          <div className="space-y-4">
            {brokers.map((broker) => {
              const conversionRate = broker.total_leads > 0
                ? Math.round((broker.closed_leads / broker.total_leads) * 100)
                : 0;

              return (
                <div key={broker.id} className="border-b pb-4 last:border-b-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg font-semibold text-gray-900">
                      {broker.name}
                    </span>
                    <span className="text-sm text-gray-500">
                      {broker.active_leads} active • {broker.closed_leads} closed
                    </span>
                  </div>

                  {/* Visual Bar Chart */}
                  <div className="relative h-10 bg-gray-200 rounded-lg overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-green-500 flex items-center justify-end pr-3"
                      style={{ width: `${conversionRate}%` }}
                    >
                      {conversionRate > 15 && (
                        <span className="text-white font-bold text-sm">
                          {conversionRate}% Conversion
                        </span>
                      )}
                    </div>
                    {conversionRate <= 15 && (
                      <div className="absolute inset-0 flex items-center pl-3">
                        <span className="text-gray-700 font-bold text-sm">
                          {conversionRate}% Conversion
                        </span>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-gray-500 mt-1">
                    Last active: {broker.last_activity_at
                      ? new Date(broker.last_activity_at).toLocaleDateString()
                      : 'Never'}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Invisible Automation Log */}
      <div className="bg-green-50 border-2 border-green-500 rounded-lg p-6 mb-8">
        <div className="flex items-center mb-4">
          <svg className="w-8 h-8 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-2xl font-bold text-green-900">
            Handled by AI (Last 24h)
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4">
            <p className="text-3xl font-bold text-green-600">12</p>
            <p className="text-gray-600">Documents Processed</p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <p className="text-3xl font-bold text-green-600">8</p>
            <p className="text-gray-600">Chasers Sent</p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <p className="text-3xl font-bold text-green-600">3</p>
            <p className="text-gray-600">Leads Auto-Reassigned</p>
          </div>
        </div>

        <p className="text-green-800 mt-4 text-sm">
          ✨ The system is working in the background while you focus on high-priority decisions.
        </p>
      </div>

      {/* Technical Details (Collapsed by Default) */}
      <div className="bg-white rounded-lg shadow-md">
        <button
          onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
          className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
        >
          <span className="text-lg font-semibold text-gray-700">
            Technical Details
          </span>
          <svg
            className={`w-6 h-6 text-gray-500 transition-transform ${showTechnicalDetails ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showTechnicalDetails && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <pre className="text-xs text-gray-600 overflow-x-auto">
              {JSON.stringify({ overview, brokers, needsAttention }, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
