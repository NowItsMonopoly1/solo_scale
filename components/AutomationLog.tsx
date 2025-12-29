import React, { useState } from 'react';

const AutomationLog: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Mock data - replace with actual API call
  const automatedTasks = [
    { id: 1, task: 'Document extracted from paystub', timestamp: '2 hours ago' },
    { id: 2, task: 'Chaser SMS sent for missing YTD income', timestamp: '1 hour ago' },
    { id: 3, task: 'Lead reassigned automatically', timestamp: '30 min ago' },
  ];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <h2 className="text-xl font-semibold text-slate-900">Handled by AI</h2>
        <span className="text-slate-500">{isExpanded ? '▼' : '▶'}</span>
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-2">
          {automatedTasks.map((task) => (
            <div key={task.id} className="flex justify-between text-sm text-slate-600 border-b border-slate-100 pb-2">
              <span>{task.task}</span>
              <span>{task.timestamp}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AutomationLog;