import React from 'react';
import { APIService } from '../services/apiService';

interface Lead {
  id: string;
  clientName: string;
  lastActivity: string;
  reason: string;
}

interface LeadReassignmentPanelProps {
  leads: Lead[];
  onReassign: () => void;
}

const LeadReassignmentPanel: React.FC<LeadReassignmentPanelProps> = ({ leads, onReassign }) => {
  const handleApprove = async (leadId: string) => {
    await APIService.reassignLead(leadId, { action: 'approve' });
    onReassign();
  };

  const handleReassign = async (leadId: string) => {
    await APIService.reassignLead(leadId, { action: 'reassign_to_senior' });
    onReassign();
  };

  const handleCall = async (leadId: string) => {
    // Trigger phone call or open dialer
    window.open(`tel:${leadId}`); // Placeholder - integrate with actual phone system
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-slate-900 mb-4">Leads Needing Action</h2>
      <div className="space-y-4">
        {leads.map((lead) => (
          <div key={lead.id} className="border border-slate-200 rounded-lg p-4">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-medium text-slate-900">{lead.clientName}</h3>
                <p className="text-sm text-slate-600">Last activity: {lead.lastActivity}</p>
                <p className="text-sm text-slate-500">{lead.reason}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleApprove(lead.id)}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg text-center transition-colors"
              >
                APPROVE
              </button>
              <button
                onClick={() => handleReassign(lead.id)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg text-center transition-colors"
              >
                REASSIGN
              </button>
              <button
                onClick={() => handleCall(lead.id)}
                className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 px-4 rounded-lg text-center transition-colors"
              >
                CALL
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LeadReassignmentPanel;