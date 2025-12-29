# Messaging API - Usage Examples

## Endpoint Overview

Base URL: `https://api.soloscale.ai`

All endpoints require JWT authentication via `Authorization: Bearer <token>` header.

---

## 1. Send Single Chaser (SMS)

**Endpoint:** `POST /accounts/:id/messaging/send-chaser`

Send an automated chaser SMS to a client when documents are missing.

### Request

```bash
curl -X POST https://api.soloscale.ai/accounts/acc_abc123/messaging/send-chaser \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "leadId": "lead_xyz789",
    "phoneNumber": "+15551234567",
    "message": "Hi John, we need your complete paystub with Year-to-Date income to proceed. Can you resend? Thanks!",
    "clientName": "John Doe",
    "metadata": {
      "documentType": "Paystub",
      "missingField": "Year-to-Date income",
      "extractionId": "doc_abc123"
    }
  }'
```

### Response (200 OK)

```json
{
  "success": true,
  "messageId": "SM1234567890abcdef",
  "channel": "sms",
  "recipient": "+15551234567",
  "message": "Chaser sent successfully",
  "timestamp": "2025-01-15T14:32:10.123Z"
}
```

### TypeScript Example

```typescript
const sendChaser = async (leadId: string, phone: string, message: string) => {
  const response = await fetch(`/accounts/${accountId}/messaging/send-chaser`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwtToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      leadId,
      phoneNumber: phone,
      message,
      clientName: 'John Doe',
      metadata: {
        documentType: 'Paystub',
        missingField: 'YTD income'
      }
    })
  });

  const data = await response.json();

  if (data.success) {
    console.log('✅ SMS sent:', data.messageId);
  } else {
    console.error('❌ Send failed');
  }
};
```

---

## 2. Send Email Chaser

**Endpoint:** `POST /accounts/:id/messaging/send-chaser`

Send an automated chaser email instead of SMS.

### Request

```bash
curl -X POST https://api.soloscale.ai/accounts/acc_abc123/messaging/send-chaser \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "leadId": "lead_xyz789",
    "email": "john.doe@example.com",
    "message": "Hi John, we need your complete W-2 form to finalize your mortgage application. Please upload it at your earliest convenience.",
    "clientName": "John Doe",
    "metadata": {
      "documentType": "W-2",
      "missingField": "Complete W-2 form"
    }
  }'
```

### Response (200 OK)

```json
{
  "success": true,
  "messageId": "x-msg-id-abc123",
  "channel": "email",
  "recipient": "john.doe@example.com",
  "message": "Chaser sent successfully",
  "timestamp": "2025-01-15T14:35:22.456Z"
}
```

---

## 3. Get Chaser History for a Lead

**Endpoint:** `GET /accounts/:id/messaging/history/:leadId`

Retrieve all chaser messages sent for a specific lead.

### Request

```bash
curl -X GET https://api.soloscale.ai/accounts/acc_abc123/messaging/history/lead_xyz789 \
  -H "Authorization: Bearer eyJhbGc..."
```

### Response (200 OK)

```json
{
  "leadId": "lead_xyz789",
  "totalChasers": 3,
  "history": [
    {
      "action": "chaser.sent.sms",
      "channel": "sms",
      "success": true,
      "timestamp": "2025-01-15T14:32:10.123Z",
      "metadata": {
        "messageId": "SM1234567890abcdef",
        "recipient": "+15551234567",
        "documentType": "Paystub",
        "missingField": "Year-to-Date income"
      }
    },
    {
      "action": "chaser.sent.email",
      "channel": "email",
      "success": true,
      "timestamp": "2025-01-14T10:15:30.789Z",
      "metadata": {
        "messageId": "x-msg-id-xyz456",
        "recipient": "john.doe@example.com",
        "documentType": "Bank Statement"
      }
    },
    {
      "action": "chaser.failed.sms",
      "channel": "sms",
      "success": false,
      "timestamp": "2025-01-13T16:45:00.000Z",
      "metadata": {
        "error": "Invalid phone number format"
      }
    }
  ]
}
```

### TypeScript Example

```typescript
const getChaserHistory = async (leadId: string) => {
  const response = await fetch(`/accounts/${accountId}/messaging/history/${leadId}`, {
    headers: {
      'Authorization': `Bearer ${jwtToken}`
    }
  });

  const data = await response.json();

  console.log(`Total chasers sent: ${data.totalChasers}`);
  data.history.forEach(entry => {
    const status = entry.success ? '✅' : '❌';
    console.log(`${status} ${entry.channel} - ${new Date(entry.timestamp).toLocaleString()}`);
  });
};
```

---

## 4. Send Batch Chasers

**Endpoint:** `POST /accounts/:id/messaging/batch-chasers`

Send multiple chaser messages at once (up to 100 per batch).

### Request

```bash
curl -X POST https://api.soloscale.ai/accounts/acc_abc123/messaging/batch-chasers \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "chasers": [
      {
        "leadId": "lead_001",
        "phoneNumber": "+15551111111",
        "message": "Hi Alice, we need your paystub with YTD to proceed. Thanks!",
        "clientName": "Alice Johnson",
        "metadata": { "documentType": "Paystub" }
      },
      {
        "leadId": "lead_002",
        "email": "bob@example.com",
        "message": "Hi Bob, please upload your bank statement. Thanks!",
        "clientName": "Bob Smith",
        "metadata": { "documentType": "Bank Statement" }
      },
      {
        "leadId": "lead_003",
        "phoneNumber": "+15553333333",
        "message": "Hi Carol, we need your W-2 form to finalize your application.",
        "clientName": "Carol White",
        "metadata": { "documentType": "W-2" }
      }
    ]
  }'
```

### Response (200 OK)

```json
{
  "success": true,
  "total": 3,
  "sent": 3,
  "failed": 0,
  "results": [
    {
      "success": true,
      "messageId": "SM111",
      "timestamp": "2025-01-15T15:00:01.000Z"
    },
    {
      "success": true,
      "messageId": "x-msg-id-222",
      "timestamp": "2025-01-15T15:00:02.100Z"
    },
    {
      "success": true,
      "messageId": "SM333",
      "timestamp": "2025-01-15T15:00:03.200Z"
    }
  ]
}
```

### TypeScript Example

```typescript
const sendBatchChasers = async (leads: Array<{ leadId: string; phone: string; name: string }>) => {
  const chasers = leads.map(lead => ({
    leadId: lead.leadId,
    phoneNumber: lead.phone,
    message: `Hi ${lead.name}, we need your document to proceed. Can you upload it? Thanks!`,
    clientName: lead.name,
    metadata: { source: 'automated_batch' }
  }));

  const response = await fetch(`/accounts/${accountId}/messaging/batch-chasers`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwtToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ chasers })
  });

  const data = await response.json();
  console.log(`📊 Batch complete: ${data.sent} sent, ${data.failed} failed`);
};
```

---

## 5. Integrated Workflow Example

Combine document extraction with automated chaser:

```typescript
import { documentQueue } from './workers/documentWorker';
import { MessagingService } from './services/messaging/messagingService';

// 1. User uploads document
const uploadDocument = async (file: File, leadId: string, clientPhone: string) => {
  // Convert to base64
  const base64 = await fileToBase64(file);

  // Queue for processing
  const queueResponse = await fetch('/documents/process', {
    method: 'POST',
    body: JSON.stringify({
      leadId,
      fileData: base64,
      mimeType: file.type,
      clientPhone
    })
  });

  const { jobId } = await queueResponse.json();

  // 2. Poll status
  const pollInterval = setInterval(async () => {
    const statusResponse = await fetch(`/documents/status/${jobId}`);
    const status = await statusResponse.json();

    if (status.status === 'completed') {
      clearInterval(pollInterval);

      // 3. Check if automated chaser was triggered
      if (status.result.chaserSent) {
        console.log('✅ Automated chaser sent to client');
      }

      // 4. If no chaser, but manual follow-up needed
      if (!status.result.chaserSent && status.result.extractionConfidence < 70) {
        // Manually trigger chaser
        await fetch(`/accounts/${accountId}/messaging/send-chaser`, {
          method: 'POST',
          body: JSON.stringify({
            leadId,
            phoneNumber: clientPhone,
            message: 'Hi, we had trouble reading your document. Can you resend a clearer version? Thanks!',
            metadata: { reason: 'low_confidence', confidence: status.result.extractionConfidence }
          })
        });
      }
    }
  }, 2000);
};
```

---

## Error Responses

### 400 Bad Request

```json
{
  "error": "Either phoneNumber or email must be provided"
}
```

### 401 Unauthorized

```json
{
  "error": "Unauthorized - JWT token required"
}
```

### 403 Forbidden

```json
{
  "error": "Access denied - account mismatch"
}
```

### 404 Not Found

```json
{
  "error": "Lead not found or does not belong to this account"
}
```

### 500 Internal Server Error

```json
{
  "error": "Failed to send sms: Invalid phone number"
}
```

---

## Rate Limits

- **Single Chaser**: No rate limit (individual sends)
- **Batch Chasers**: Max 100 chasers per request
- **Twilio Rate Limit**: 20 SMS per minute (configured in worker)

---

## Audit Trail

All chaser attempts are automatically logged to `audit_logs` table:

```sql
SELECT
  action,
  metadata->>'messageId' as message_id,
  metadata->>'channel' as channel,
  metadata->>'recipient' as recipient,
  created_at
FROM audit_logs
WHERE action LIKE 'chaser.%'
  AND account_id = 'acc_abc123'
ORDER BY created_at DESC;
```

---

## Best Practices

1. **Always validate phone numbers** in E.164 format before sending SMS
2. **Use metadata** to track document context for better audit trails
3. **Check chaser history** before sending to avoid spam
4. **Use batch endpoint** for bulk operations to reduce API calls
5. **Monitor failed sends** and retry with exponential backoff
6. **Log all chaser attempts** for compliance and debugging

---

## Testing

### Test Endpoints (Development Only)

```bash
# Test SMS (requires Twilio sandbox number)
curl -X POST http://localhost:3000/api/test/send-sms \
  -H "Content-Type: application/json" \
  -d '{"phone": "+15551234567", "message": "Test from SoloScale"}'

# Test Email
curl -X POST http://localhost:3000/api/test/send-email \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "message": "Test from SoloScale"}'
```

---

**Ready to automate client follow-ups!** 🚀
