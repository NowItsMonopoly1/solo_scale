import React from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

interface TeamPerformanceChartProps {
  metrics: {
    totalLeads: number;
    conversionRate: number;
    avgResponseTime: number;
    reassignments: number;
  };
}

const TeamPerformanceChart: React.FC<TeamPerformanceChartProps> = ({ metrics }) => {
  const barData = {
    labels: ['Total Leads', 'Conversions', 'Reassignments'],
    datasets: [{
      label: 'Team Metrics',
      data: [metrics.totalLeads, Math.round(metrics.totalLeads * metrics.conversionRate / 100), metrics.reassignments],
      backgroundColor: ['#3b82f6', '#10b981', '#f59e0b'],
    }]
  };

  const pieData = {
    labels: ['Converted', 'Pending', 'Reassigned'],
    datasets: [{
      data: [
        Math.round(metrics.totalLeads * metrics.conversionRate / 100),
        metrics.totalLeads - Math.round(metrics.totalLeads * metrics.conversionRate / 100) - metrics.reassignments,
        metrics.reassignments
      ],
      backgroundColor: ['#10b981', '#6b7280', '#f59e0b'],
    }]
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-slate-900 mb-4">Team Performance</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-medium mb-2">Lead Distribution</h3>
          <Bar data={barData} />
        </div>
        <div>
          <h3 className="text-lg font-medium mb-2">Conversion Breakdown</h3>
          <Pie data={pieData} />
        </div>
      </div>
      <div className="mt-4 text-sm text-slate-600">
        Avg Response Time: {metrics.avgResponseTime}min | Conversion Rate: {metrics.conversionRate}%
      </div>
    </div>
  );
};

export default TeamPerformanceChart;