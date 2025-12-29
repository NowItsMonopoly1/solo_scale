# SoloScale API Quick Reference

## Conversation Lifecycle APIs

### Base URL
```
http://localhost:3001
```

### Authentication
All requests require JWT token:
```
Authorization: Bearer <your-jwt-token>
```

---

## Endpoints

### 1. Create Conversation
```http
POST /accounts/:accountId/conversations
```

**Request:**
```json
{
  "lead_id": "uuid",           // optional
  "realtor_id": "uuid",        // optional
  "subject": "string"          // optional
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "account_id": "uuid",
  "lead_id": "uuid",
  "status": "active",
  "message_count": 0,
  "created_at": "2024-01-15T10:00:00Z"
}
```

---

### 2. List Conversations
```http
GET /accounts/:accountId/conversations?status=active&limit=10&offset=0
```

**Query Parameters:**
- `status` (optional): 'active' | 'closed' | 'archived'
- `lead_id` (optional): Filter by lead UUID
- `limit` (optional): Default 50, max 100
- `offset` (optional): For pagination

**Response (200):**
```json
{
  "conversations": [
    {
      "id": "uuid",
      "subject": "Mortgage inquiry",
      "status": "active",
      "message_count": 5,
      "last_message_at": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 42
}
```

---

### 3. Get Conversation Details
```http
GET /conversations/:id?accountId=uuid
```

**Response (200):**
```json
{
  "id": "uuid",
  "subject": "Mortgage inquiry",
  "status": "active",
  "message_count": 5,
  "messages": [
    {
      "id": "uuid",
      "direction": "inbound",
      "channel": "sms",
      "body": "Hello, I need information about rates",
      "created_at": "2024-01-15T10:00:00Z"
    }
  ]
}
```

---

### 4. Close Conversation (Generate AI Summary)
```http
POST /conversations/:id/close?accountId=uuid
```

**Request:**
```json
{
  "close_reason": "string"     // optional
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "status": "closed",
  "ai_summary": "Customer inquired about refinancing their current mortgage. Primary concern was lowering monthly payment. Next step: Schedule loan officer call. Urgency: High.",
  "ai_summary_generated_at": "2024-01-15T11:00:00Z",
  "closed_at": "2024-01-15T11:00:00Z",
  "closed_by": "user-uuid",
  "close_reason": "Lead converted",
  "message_count": 5
}
```

**Errors:**
- `400` - Conversation already closed
- `404` - Conversation not found

---

### 5. Reopen Conversation
```http
POST /conversations/:id/reopen?accountId=uuid
```

**Response (200):**
```json
{
  "id": "uuid",
  "status": "active",
  "closed_at": null,
  "closed_by": null,
  "close_reason": null
}
```

---

### 6. Get Conversation History
```http
GET /accounts/:accountId/conversations/history?limit=10
```

Returns all closed conversations with AI summaries.

**Query Parameters:**
- `lead_id` (optional): Filter by lead
- `limit` (optional): Default 50
- `offset` (optional): For pagination

**Response (200):**
```json
{
  "conversations": [
    {
      "id": "uuid",
      "subject": "Past conversation",
      "status": "closed",
      "ai_summary": "Summary of the conversation...",
      "message_count": 8,
      "closed_at": "2024-01-14T15:00:00Z"
    }
  ],
  "total": 15
}
```

---

### 7. Add Message to Conversation
```http
POST /conversations/:id/messages?accountId=uuid
```

**Request:**
```json
{
  "direction": "outbound",           // required: "inbound" | "outbound"
  "channel": "sms",                  // required: "sms" | "email"
  "body": "string",                  // required
  "from_number": "+1234567890",      // optional
  "to_number": "+0987654321",        // optional
  "from_email": "agent@example.com", // optional
  "to_email": "lead@example.com",    // optional
  "subject": "string",               // optional (for email)
  "ai_generated": false              // optional
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "conversation_id": "uuid",
  "direction": "outbound",
  "channel": "sms",
  "body": "Thanks for your inquiry!",
  "status": "pending",
  "created_at": "2024-01-15T11:30:00Z"
}
```

---

## Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error, already closed, etc.)
- `401` - Unauthorized (missing/invalid token)
- `404` - Not Found
- `500` - Internal Server Error

---

## Example: Complete Flow

### 1. Create a conversation
```bash
curl -X POST http://localhost:3001/accounts/acc-123/conversations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "lead_id": "lead-456",
    "subject": "Refinance inquiry"
  }'

# Response: {"id": "conv-789", "status": "active", ...}
```

### 2. Add messages
```bash
curl -X POST http://localhost:3001/conversations/conv-789/messages?accountId=acc-123 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "direction": "inbound",
    "channel": "sms",
    "body": "What are current rates?"
  }'
```

### 3. Close conversation
```bash
curl -X POST http://localhost:3001/conversations/conv-789/close?accountId=acc-123 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "close_reason": "Provided rate quote"
  }'

# Response includes AI-generated summary
```

### 4. View history
```bash
curl http://localhost:3001/accounts/acc-123/conversations/history \
  -H "Authorization: Bearer $TOKEN"
```

---

## Interactive API Documentation

Visit **http://localhost:3001/docs** for interactive Swagger UI where you can:
- Try all endpoints
- See request/response schemas
- View validation rules
- Test with your JWT token

---

## Development Tips

### Enable Request Logging
Set in `.env`:
```
LOG_LEVEL=debug
```

### Test Without JWT (Development Only)
Modify `src/api/routes.ts` to comment out JWT verification hook.

### View Database Records
```sql
-- See all conversations
SELECT * FROM conversations ORDER BY created_at DESC;

-- See conversation with summary
SELECT id, subject, ai_summary, closed_at
FROM conversations
WHERE status = 'closed'
ORDER BY closed_at DESC;

-- See audit logs
SELECT * FROM audit_logs
WHERE action LIKE 'conversation%'
ORDER BY created_at DESC;
```
