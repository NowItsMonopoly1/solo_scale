# SoloScale "Phase-Out" Implementation Guide
## Transform from Tool to Digital Employee

This guide walks you through deploying the three critical systems that enable true broker retirement: automated messaging, exception-only oversight, and background processing.

---

## 📦 Prerequisites

### Environment Variables

Add to your `.env` file:

```bash
# Twilio (SMS)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# SendGrid (Email)
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@soloscale.ai
SENDGRID_FROM_NAME=SoloScale Mortgage

# Redis (Queue)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=optional_password

# Frontend URL (for email links)
FRONTEND_URL=https://app.soloscale.ai
```

### Dependencies

Install required packages:

```bash
# Backend
cd backend
npm install twilio @sendgrid/mail bullmq ioredis

# Start Redis (required for queue)
docker run -d -p 6379:6379 redis:latest
```

---

## 🚀 Step 1: Automated Messaging Service

### What It Does
- Sends SMS via Twilio when documents need follow-up
- Sends professional emails via SendGrid
- Logs all communication attempts to audit trail
- Tracks delivery status and failures

### Implementation

1. **Service is ready** at `backend/src/services/messaging/messagingService.ts`

2. **Usage Example**:

```typescript
import { MessagingService } from './services/messaging/messagingService';

// Send automated chaser
const result = await MessagingService.sendChaser({
  leadId: 'lead_abc123',
  accountId: user.accountId,
  userId: user.id,
  message: 'Hi John, we need your complete paystub with YTD to proceed. Can you resend? Thanks!',
  channel: 'sms',
  recipient: {
    phone: '+15551234567',
    email: 'john@example.com',
    name: 'John Doe'
  },
  metadata: {
    documentType: 'Paystub',
    missingField: 'Year-to-Date income',
    extractionId: 'doc_123'
  }
});

if (result.success) {
  console.log('✅ Chaser sent:', result.messageId);
} else {
  console.error('❌ Send failed:', result.error);
}
```

3. **View Chaser History**:

```typescript
const history = await MessagingService.getChaserHistory(
  accountId,
  leadId
);

// Returns:
// [
//   {
//     action: 'chaser.sent.sms',
//     channel: 'sms',
//     success: true,
//     timestamp: Date,
//     metadata: { ... }
//   }
// ]
```

### Testing

```bash
# Test SMS
curl -X POST http://localhost:3000/api/test/send-sms \
  -H "Content-Type: application/json" \
  -d '{"phone": "+15551234567", "message": "Test from SoloScale"}'

# Test Email
curl -X POST http://localhost:3000/api/test/send-email \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "message": "Test from SoloScale"}'
```

### Audit Trail

All messaging attempts are logged to `audit_logs` table:

```sql
SELECT action, metadata, created_at
FROM audit_logs
WHERE action LIKE 'chaser.%'
ORDER BY created_at DESC;
```

---

## 📊 Step 2: Strategic Oversight Dashboard

### What It Does
- **3-Column Exception Dashboard**: Only shows items needing broker attention
- **Column 1 (Handled by AI)**: Documents processed, chasers sent, leads scored
- **Column 2 (Action Required)**: High discrepancies, low confidence, name mismatches
- **Column 3 (High-Value Leads)**: Urgency score >90, ready for broker calls
- **Retirement Metrics**: Tracks time saved by AI automation

### Implementation

1. **Dashboard updated** at `pages/Dashboard.tsx`

2. **Data Sources** (replace simulated data with backend calls):

```typescript
// In Dashboard.tsx, replace mock data with:

// Fetch automated actions
const automatedActions = await fetch('/api/activity/automated').then(r => r.json());

// Fetch action-required items
const actionsRequired = await fetch('/api/activity/exceptions').then(r => r.json());

// High-value leads already pulled from AgentContext
const highValueLeads = leads.filter(l => (l.urgencyScore || 0) > 90);
```

3. **Backend Endpoints to Create**:

```typescript
// backend/src/api/routes/activity.ts

// GET /api/activity/automated
// Returns recent AI actions (document processed, chasers sent, leads analyzed)

// GET /api/activity/exceptions
// Returns items needing manual review (high discrepancies, low confidence)

// GET /api/activity/retirement-metrics
// Returns time saved, documents processed, chasers sent
```

### Broker Workflow

**Daily 1-Hour Check-In:**
1. Open Strategic Oversight Dashboard
2. Review "Action Required" column (5-10 min)
3. Call top 3 leads from "High-Value Leads" column (30-40 min)
4. Verify "Handled by AI" column shows active automation (5 min)
5. Done! Rest of day is free.

---

## ⚙️ Step 3: Background Worker Queue

### What It Does
- Moves document extraction to background jobs
- Prevents frontend hanging on large uploads
- Processes up to 5 documents concurrently
- Rate-limited to 20 jobs/minute (stays under API limits)
- Auto-retries failed jobs (3 attempts with exponential backoff)

### Implementation

1. **Worker is ready** at `backend/src/workers/documentWorker.ts`

2. **Start the Worker**:

```bash
# In separate terminal
cd backend
node dist/workers/documentWorker.js
```

3. **Add to package.json scripts**:

```json
{
  "scripts": {
    "worker": "node dist/workers/documentWorker.js",
    "worker:dev": "ts-node-dev --respawn src/workers/documentWorker.ts"
  }
}
```

4. **Production Deployment (PM2)**:

```bash
# Install PM2
npm install -g pm2

# Start worker
pm2 start dist/workers/documentWorker.js --name soloscale-worker

# Monitor
pm2 logs soloscale-worker

# Auto-restart on system reboot
pm2 startup
pm2 save
```

### Frontend Integration

#### Queue Document for Processing

```typescript
import { useAgent } from './contexts/AgentContext';

function MyComponent() {
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('idle');

  const handleUpload = async (file: File, leadId: string) => {
    // Convert to base64
    const base64 = await fileToBase64(file);

    // Queue for background processing
    const response = await fetch('/api/documents/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leadId,
        fileData: base64,
        mimeType: file.type,
        expectedBorrowerName: 'John Doe',
        clientName: 'John Doe',
        clientPhone: '+15551234567'
      })
    });

    const data = await response.json();
    setJobId(data.jobId);
    setStatus('queued');

    // Start polling
    pollJobStatus(data.jobId);
  };

  const pollJobStatus = async (jobId: string) => {
    const interval = setInterval(async () => {
      const response = await fetch(`/api/documents/status/${jobId}`);
      const data = await response.json();

      setStatus(data.status);

      if (data.status === 'completed') {
        clearInterval(interval);
        console.log('✅ Extraction complete:', data.result);

        // Check if chaser was sent
        if (data.result.chaserSent) {
          alert('📱 Automated chaser sent to client!');
        }
      } else if (data.status === 'failed') {
        clearInterval(interval);
        console.error('❌ Extraction failed:', data.error);
      }
    }, 2000); // Poll every 2 seconds
  };

  return (
    <div>
      <input type="file" onChange={(e) => e.target.files && handleUpload(e.target.files[0], 'lead_123')} />
      {status !== 'idle' && <p>Status: {status}</p>}
    </div>
  );
}
```

#### Batch Processing

```typescript
// Queue multiple documents at once
const response = await fetch('/api/documents/batch-process', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    documents: [
      { leadId: 'lead_1', fileData: base64_1, mimeType: 'application/pdf' },
      { leadId: 'lead_2', fileData: base64_2, mimeType: 'image/jpeg' },
      { leadId: 'lead_3', fileData: base64_3, mimeType: 'application/pdf' }
    ]
  })
});

const { jobIds, batchId } = await response.json();
console.log(`Queued ${jobIds.length} documents. Batch ID: ${batchId}`);
```

### Monitoring

```typescript
// Get queue stats
import { documentQueue } from './workers/documentWorker';

const waiting = await documentQueue.getWaitingCount();
const active = await documentQueue.getActiveCount();
const completed = await documentQueue.getCompletedCount();
const failed = await documentQueue.getFailedCount();

console.log('Queue Stats:', { waiting, active, completed, failed });
```

---

## 🗄️ Database Setup

### Run Migrations

```bash
cd backend
psql -U postgres -d soloscale -f src/db/migrations/002_document_extractions.sql
```

### Verify Tables

```sql
-- Check document_extractions table
SELECT * FROM document_extractions LIMIT 5;

-- Check audit_logs for chaser attempts
SELECT * FROM audit_logs WHERE action LIKE 'chaser.%' ORDER BY created_at DESC;
```

---

## 🧪 End-to-End Test

### Test Complete Workflow

```typescript
// 1. Upload document (triggers worker)
const file = document.getElementById('fileInput').files[0];
const base64 = await fileToBase64(file);

const queueResponse = await fetch('/api/documents/process', {
  method: 'POST',
  body: JSON.stringify({
    leadId: 'lead_test123',
    fileData: base64,
    mimeType: 'application/pdf',
    clientName: 'Test Client',
    clientPhone: '+15551234567'
  })
});

const { jobId } = await queueResponse.json();
console.log('Queued job:', jobId);

// 2. Poll status
const statusInterval = setInterval(async () => {
  const status = await fetch(`/api/documents/status/${jobId}`).then(r => r.json());
  console.log('Status:', status.status, 'Progress:', status.progress);

  if (status.status === 'completed') {
    clearInterval(statusInterval);

    // 3. Verify extraction
    console.log('Extraction result:', status.result);

    // 4. Check if chaser was sent
    if (status.result.chaserSent) {
      console.log('✅ Automated chaser sent!');

      // 5. Verify in database
      const history = await fetch(`/api/documents/history/lead_test123`).then(r => r.json());
      console.log('Document history:', history);

      // 6. Check chaser in audit logs
      const chasers = await MessagingService.getChaserHistory(accountId, 'lead_test123');
      console.log('Chaser history:', chasers);
    }
  }
}, 2000);
```

---

## 📈 ROI Breakdown

| Feature | Dev Time | Broker Time Saved |
|---------|----------|-------------------|
| **Automated Messaging** | 2 hours | 1.5 hrs/day (no manual follow-ups) |
| **Strategic Dashboard** | 1 hour | 3 hrs/day (exception-only review) |
| **Background Worker** | 3 hours | 2 hrs/day (no upload waiting) |
| **TOTAL** | **~6 hours** | **6.5 hrs/day → Broker "retirement"** |

---

## 🚦 Production Checklist

- [ ] Set up Twilio account and get phone number
- [ ] Configure SendGrid API key and verify domain
- [ ] Deploy Redis instance (AWS ElastiCache, Railway, Upstash)
- [ ] Run database migrations
- [ ] Start background worker with PM2
- [ ] Test SMS/Email delivery
- [ ] Monitor worker queue health
- [ ] Set up alerts for failed jobs
- [ ] Configure rate limiting
- [ ] Add webhooks for Twilio delivery status

---

## 🎯 Next Steps

1. **Week 1**: Deploy messaging service, test with real phone numbers
2. **Week 2**: Launch Strategic Oversight dashboard for brokers
3. **Week 3**: Enable background worker, process first 100 documents
4. **Week 4**: Measure time saved, adjust automation thresholds

---

## 📞 Support

For questions or troubleshooting:
1. Check worker logs: `pm2 logs soloscale-worker`
2. Check queue stats: `documentQueue.getWaitingCount()`
3. Review audit logs: `SELECT * FROM audit_logs WHERE action LIKE 'chaser.%'`
4. Monitor Redis: `redis-cli MONITOR`

---

**You've now transformed SoloScale from a "tool" to a "Digital Employee."**

The broker can safely delegate document processing and client follow-ups to the AI workforce, only stepping in for high-value calls and exception handling.

🎉 **Welcome to broker retirement!**
