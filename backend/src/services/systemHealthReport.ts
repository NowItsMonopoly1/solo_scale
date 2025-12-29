import sgMail from '@sendgrid/mail';
import { db } from '../db/client.js';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

interface SystemHealthData {
  totalLeads: number;
  activeLeads: number;
  convertedLeads: number;
  avgResponseTime: number;
  reassignments: number;
  aiTasksCompleted: number;
  juniorBrokers: number;
  seniorPartners: number;
}

const getSystemHealthData = async (): Promise<SystemHealthData> => {
  // Mock data for now - replace with actual queries
  const totalLeads = await db.query('SELECT COUNT(*) as count FROM leads').then(r => parseInt(r.rows[0].count));
  const activeLeads = await db.query("SELECT COUNT(*) as count FROM leads WHERE status IN ('active', 'processing')").then(r => parseInt(r.rows[0].count));
  const convertedLeads = await db.query("SELECT COUNT(*) as count FROM leads WHERE status = 'converted'").then(r => parseInt(r.rows[0].count));
  const reassignments = await db.query('SELECT COUNT(*) as count FROM lead_activity_log WHERE action = $1', ['reassigned']).then(r => parseInt(r.rows[0].count));
  const aiTasksCompleted = await db.query('SELECT COUNT(*) as count FROM document_extractions').then(r => parseInt(r.rows[0].count));

  // Mock other data
  const avgResponseTime = 12; // minutes
  const juniorBrokers = 3;
  const seniorPartners = 1;

  return {
    totalLeads,
    activeLeads,
    convertedLeads,
    avgResponseTime,
    reassignments,
    aiTasksCompleted,
    juniorBrokers,
    seniorPartners,
  };
};

export const generateSystemHealthReport = async (): Promise<string> => {
  try {
    const data = await getSystemHealthData();

    return `
# SoloScale System Health Report
**Week Ending: ${new Date().toLocaleDateString()}**

## 📊 Firm Overview
- **Total Team Members**: ${data.juniorBrokers + data.seniorPartners} (${data.seniorPartners} Senior Partners, ${data.juniorBrokers} Junior Brokers)
- **Total Leads This Week**: ${data.totalLeads}
- **Active Leads**: ${data.activeLeads}
- **Conversions**: ${data.convertedLeads} (${data.totalLeads > 0 ? Math.round((data.convertedLeads / data.totalLeads) * 100) : 0}% rate)

## ⚡ Performance Metrics
- **Average Response Time**: ${data.avgResponseTime} minutes
- **Automatic Reassignments**: ${data.reassignments}
- **AI Tasks Completed**: ${data.aiTasksCompleted} (documents processed, chasers sent)

## 🚨 Exceptions Requiring Attention
${data.reassignments > 0 ? `- ${data.reassignments} leads were automatically reassigned due to inactivity` : '- No reassignments this week - excellent team performance!'}

## 💡 AI Automation Savings
- **Time Saved**: ~${Math.round(data.aiTasksCompleted * 0.5)} hours (based on 30min per task)
- **Documents Processed**: ${data.aiTasksCompleted} automated extractions
- **Chaser Messages Sent**: ${data.aiTasksCompleted} follow-ups

## 📈 Trends
${data.convertedLeads > data.totalLeads * 0.7 ? '✅ Conversion rate above target (70%)' : '⚠️ Conversion rate below target - review lead quality'}
${data.avgResponseTime < 15 ? '✅ Response times optimal (<15min)' : '⚠️ Response times elevated - check team capacity'}

---
*This report is generated automatically every Friday. Contact support@soloscale.ai for questions.*
*SoloScale - Retirement-Ready Mortgage Automation*
    `.trim();
  } catch (error) {
    console.error('Failed to generate health report:', error);
    return 'Error generating system health report. Please check system logs.';
  }
};

export const sendSystemHealthReport = async (recipientEmail: string): Promise<void> => {
  const reportContent = await generateSystemHealthReport();

  const msg = {
    to: recipientEmail,
    from: process.env.SENDGRID_FROM_EMAIL!,
    subject: `SoloScale System Health Report - ${new Date().toLocaleDateString()}`,
    text: reportContent,
    html: reportContent.replace(/\n/g, '<br>').replace(/^# (.*$)/gm, '<h1>$1</h1>').replace(/^## (.*$)/gm, '<h2>$1</h2>'),
  };

  await sgMail.send(msg);
  console.log('System health report sent successfully');
};