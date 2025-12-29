# SoloScale Production Deployment - Quick Start

## 🎯 Goal
Transform SoloScale from a tool into a "Digital Employee" that automates 6.5+ hours/day of broker work.

---

## ⚡ 5-Step Production Deployment

### Step 1: Install Dependencies (5 min)

```bash
# Backend dependencies
cd backend
npm install twilio @sendgrid/mail bullmq ioredis

# Start Redis (required for background queue)
docker run -d -p 6379:6379 --name soloscale-redis redis:latest
```

---

### Step 2: Configure Environment Variables (10 min)

Create/update `backend/.env`:

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/soloscale

# JWT
JWT_SECRET=your-secret-key-change-in-production

# Twilio (SMS) - Get from https://console.twilio.com
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+15551234567

# SendGrid (Email) - Get from https://app.sendgrid.com
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
SENDGRID_FROM_NAME=SoloScale Mortgage

# Redis (Queue)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=  # Optional

# Frontend URL (for email links)
FRONTEND_URL=https://app.soloscale.ai
```

**Get API Keys:**
1. **Twilio**: Sign up at https://twilio.com → Get phone number → Copy SID/Token
2. **SendGrid**: Sign up at https://sendgrid.com → Create API key → Verify sender email

---

### Step 3: Deploy Database Migrations (5 min)

```bash
cd backend

# Run document extractions table migration
psql -U postgres -d soloscale -f src/db/migrations/002_document_extractions.sql

# Verify tables exist
psql -U postgres -d soloscale -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"
```

**Expected tables:**
- `accounts`, `users`, `leads`, `audit_logs`
- `document_extractions` (new)
- `conversations`, `messages`

---

### Step 4: Start Background Worker (2 min)

```bash
cd backend

# Build TypeScript
npm run build

# Start worker with PM2 (production)
npm install -g pm2
pm2 start dist/workers/documentWorker.js --name soloscale-worker

# OR start in dev mode
npm run worker:dev

# Monitor worker
pm2 logs soloscale-worker

# Check worker status
pm2 status
```

**Verify worker is running:**
```bash
# Should show "online" status
pm2 list
```

---

### Step 5: Test End-to-End (10 min)

#### Test 1: Send SMS Chaser

```bash
# Get JWT token (login via frontend or API)
TOKEN="your_jwt_token_here"

# Send test SMS
curl -X POST http://localhost:3000/accounts/YOUR_ACCOUNT_ID/messaging/send-chaser \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "leadId": "lead_test123",
    "phoneNumber": "+15551234567",
    "message": "Test SMS from SoloScale automated chaser",
    "clientName": "Test Client"
  }'
```

**Expected:** SMS delivered to phone, response with `messageId`

#### Test 2: Queue Document Processing

```bash
# Upload a test document
curl -X POST http://localhost:3000/documents/process \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "leadId": "lead_test123",
    "fileData": "base64_encoded_pdf_here",
    "mimeType": "application/pdf",
    "clientPhone": "+15551234567"
  }'

# Response: { "jobId": "doc_lead_test123_1234567890" }

# Poll status
curl http://localhost:3000/documents/status/doc_lead_test123_1234567890 \
  -H "Authorization: Bearer $TOKEN"
```

**Expected:** Job completes, extraction result returned, automated chaser sent if YTD missing

#### Test 3: Check Audit Logs

```bash
psql -U postgres -d soloscale -c "
  SELECT action, metadata->>'messageId', created_at
  FROM audit_logs
  WHERE action LIKE 'chaser.%'
  ORDER BY created_at DESC
  LIMIT 5;
"
```

**Expected:** Log entries for `chaser.sent.sms`, `chaser.api.sent.sms`

---

## 🚀 Production Deployment Checklist

### Pre-Launch

- [ ] Twilio account verified and phone number purchased
- [ ] SendGrid domain verified and sender authenticated
- [ ] Redis deployed to production (AWS ElastiCache, Railway, Upstash)
- [ ] Database migrations run on production DB
- [ ] Environment variables set in production
- [ ] Worker process managed by PM2 or similar
- [ ] SSL/TLS enabled for all endpoints
- [ ] Rate limiting configured (20 SMS/min)

### Monitoring

- [ ] Set up PM2 monitoring: `pm2 monitor`
- [ ] Configure alerts for failed jobs
- [ ] Track worker queue health: `documentQueue.getWaitingCount()`
- [ ] Monitor Twilio delivery reports
- [ ] Review audit logs daily for chaser patterns

### Optimization

- [ ] Adjust worker concurrency based on load (default: 5)
- [ ] Tune rate limits for your Twilio plan
- [ ] Set up Redis persistence for queue durability
- [ ] Configure webhook for Twilio delivery status
- [ ] Enable SendGrid event tracking

---

## 📊 ROI Tracking

### Week 1 Metrics

Track these to measure "broker retirement" progress:

```sql
-- Documents processed automatically
SELECT COUNT(*) FROM document_extractions
WHERE created_at > NOW() - INTERVAL '7 days';

-- Automated chasers sent
SELECT COUNT(*) FROM audit_logs
WHERE action LIKE 'chaser.sent.%'
  AND created_at > NOW() - INTERVAL '7 days';

-- Time saved calculation
-- (documents_processed * 5 min) + (chasers_sent * 3 min) = hours saved
```

**Target:** 6.5+ hours/week saved by automation

---

## 🔧 Troubleshooting

### Worker Not Processing Jobs

```bash
# Check worker logs
pm2 logs soloscale-worker

# Check Redis connection
redis-cli ping  # Should return "PONG"

# Check queue stats
node -e "
  const { documentQueue } = require('./dist/workers/documentWorker.js');
  documentQueue.getWaitingCount().then(count => console.log('Waiting:', count));
"
```

### SMS Not Sending

```bash
# Verify Twilio credentials
curl -X GET 'https://api.twilio.com/2010-04-01/Accounts.json' \
  -u $TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN

# Check Twilio console for delivery status
# https://console.twilio.com/us1/monitor/logs/sms
```

### Email Not Sending

```bash
# Test SendGrid API key
curl -X POST https://api.sendgrid.com/v3/mail/send \
  -H "Authorization: Bearer $SENDGRID_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "personalizations": [{"to": [{"email": "test@example.com"}]}],
    "from": {"email": "noreply@yourdomain.com"},
    "subject": "Test",
    "content": [{"type": "text/plain", "value": "Test"}]
  }'
```

### Database Connection Issues

```bash
# Test DB connection
psql $DATABASE_URL -c "SELECT NOW();"

# Check table permissions
psql $DATABASE_URL -c "SELECT * FROM audit_logs LIMIT 1;"
```

---

## 📈 Scaling Guide

### When to Scale (Usage Indicators)

- **Worker Queue Backing Up**: Waiting jobs > 100
- **SMS Rate Limit Hit**: 20/min ceiling reached
- **Database Slow**: Query time > 1 second
- **Redis Memory Full**: `redis-cli INFO memory`

### How to Scale

#### Horizontal Worker Scaling

```bash
# Start additional workers
pm2 start dist/workers/documentWorker.js --name soloscale-worker-2
pm2 start dist/workers/documentWorker.js --name soloscale-worker-3

# All workers share same Redis queue
```

#### Vertical Redis Scaling

```bash
# Increase Redis memory
redis-cli CONFIG SET maxmemory 2gb
redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

#### Database Optimization

```sql
-- Add indexes for frequent queries
CREATE INDEX CONCURRENTLY idx_audit_logs_action_created
ON audit_logs(action, created_at DESC);

CREATE INDEX CONCURRENTLY idx_leads_account_status
ON leads(account_id, status);
```

---

## 🎓 Training Brokers

### Daily Workflow (45 min)

**Morning Check-In (15 min):**
1. Open Strategic Oversight Dashboard
2. Review "Action Required" column
3. Resolve 2-3 high-severity exceptions

**High-Value Calls (30 min):**
1. Sort "High-Value Leads" by urgency score
2. Call top 3 leads (score >90)
3. Log outcomes in CRM

**AI Summary Review (5 min):**
1. Check "Handled by AI" column
2. Verify chasers sent, documents processed
3. Done! Rest of day is free.

### What AI Handles Automatically

- ✅ Document extraction (paystubs, W-2s, bank statements)
- ✅ Missing field detection (YTD income, SSN, etc.)
- ✅ SMS/Email chasers when documents incomplete
- ✅ Lead urgency scoring and prioritization
- ✅ Exception flagging for manual review
- ✅ Audit logging for compliance

### When Broker Intervention Needed

- ❌ High-severity discrepancies (name mismatch, altered docs)
- ❌ Low extraction confidence (<70%)
- ❌ High-value leads ready for call (score >90)
- ❌ Complex client questions (AI escalates)

---

## 🎯 Success Criteria

### Week 1
- [ ] 50+ documents processed automatically
- [ ] 20+ automated chasers sent
- [ ] 3+ hours/day saved

### Month 1
- [ ] 200+ documents processed
- [ ] 100+ chasers sent
- [ ] 6+ hours/day saved
- [ ] Broker spending <1 hour/day on exceptions

### Quarter 1
- [ ] 1,000+ documents processed
- [ ] 500+ chasers sent
- [ ] Broker "retired" from paperwork
- [ ] AI handling 90%+ of document workflow

---

## 📞 Support Resources

- **Documentation**: `/PHASE_OUT_IMPLEMENTATION_GUIDE.md`
- **API Examples**: `/backend/MESSAGING_API_EXAMPLES.md`
- **Worker Logs**: `pm2 logs soloscale-worker`
- **Queue Stats**: Check Redis with `redis-cli MONITOR`
- **Audit Trail**: Query `audit_logs` table

---

## ✅ You're Ready!

**Complete these 5 steps in ~30 minutes and you'll have:**
1. ✅ Automated SMS/Email chasers
2. ✅ Background document processing
3. ✅ Strategic Oversight Dashboard
4. ✅ Full audit trail for compliance
5. ✅ 6.5+ hours/day saved for brokers

**Welcome to broker retirement!** 🎉

---

**Last Updated:** January 2025
**Version:** 1.0
**Platform:** SoloScale Digital Employee
