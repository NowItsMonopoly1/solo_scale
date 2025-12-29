import React, { useEffect, useState } from 'react';
import { APIService } from '../services/apiService';
import TeamPerformanceChart from './TeamPerformanceChart';
import LeadReassignmentPanel from './LeadReassignmentPanel';
import AutomationLog from './AutomationLog';

interface PartnerMetrics {
  totalLeads: number;
  conversionRate: number;
  avgResponseTime: number;
  reassignments: number;
}

const PartnerActivityDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<PartnerMetrics | null>(null);
  const [pendingReassignments, setPendingReassignments] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [metricsRes, reassignmentsRes] = await Promise.all([
        APIService.getPartnerPerformance(),
        APIService.getPendingReassignments()
      ]);
      setMetrics(metricsRes);
      setPendingReassignments(reassignmentsRes);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-slate-900">Partner Activity Dashboard</h1>
          <p className="text-slate-600 mt-2">Exception-only view of team performance and actions needed</p>
        </div>

        {/* Performance Charts */}
        {metrics && <TeamPerformanceChart metrics={metrics} />}

        {/* Pending Reassignments */}
        {pendingReassignments.length > 0 && (
          <LeadReassignmentPanel
            leads={pendingReassignments}
            onReassign={loadDashboardData}
          />
        )}

        {/* Automation Log (Collapsed) */}
        <AutomationLog />
      </div>
    </div>
  );
};

export default PartnerActivityDashboard;