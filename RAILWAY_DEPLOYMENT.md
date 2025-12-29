# 🚂 Railway Deployment Guide - SoloScale Platform

**Zero-Maintenance Production Infrastructure for Non-Technical Brokers**

---

## 📊 Why Railway?

Railway provides **one-click provisioning** for:
- ✅ **PostgreSQL database** (persistent storage for leads, messages, chasers)
- ✅ **Redis instance** (background job queue for document processing)
- ✅ **24/7 uptime** (automated chasers run even when broker is offline)
- ✅ **Auto-scaling** (handles growth without manual intervention)
- ✅ **Zero DevOps** (no terminal commands, no SSH, no server management)

---

## 🚀 Deployment Steps

### **Step 1: Create Railway Account**
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub (recommended for automatic deployments)
3. Verify email

### **Step 2: Create New Project**
1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose `soloscale-platform` repository
4. Railway will automatically detect Node.js and create the service

### **Step 3: Add PostgreSQL Database**
1. In your project dashboard, click **"+ New"**
2. Select **"Database"** → **"Add PostgreSQL"**
3. Railway provisions a production-ready database instantly
4. Database credentials are automatically added as environment variables

### **Step 4: Add Redis (Optional - for Background Workers)**
1. Click **"+ New"** again
2. Select **"Database"** → **"Add Redis"**
3. Used for document processing queue and cron jobs
4. Credentials auto-configured

### **Step 5: Configure Environment Variables**

Railway automatically sets `DATABASE_URL` and `REDIS_URL`. You need to add:

#### **Required Variables:**
```bash
# JWT Authentication
JWT_SECRET=<generate-with-openssl-rand-base64-32>
NODE_ENV=production

# AI Provider
GEMINI_API_KEY=<your-gemini-api-key>

# Twilio SMS
TWILIO_ACCOUNT_SID=<your-twilio-account-sid>
TWILIO_AUTH_TOKEN=<your-twilio-auth-token>
TWILIO_PHONE_NUMBER=+14155551234

# SendGrid Email
SENDGRID_API_KEY=<your-sendgrid-api-key>
SENDGRID_FROM_EMAIL=noreply@soloscale.ai

# Frontend URL (for CORS)
FRONTEND_URL=https://soloscale.vercel.app
```

#### **How to Add Variables:**
1. Click on your backend service
2. Go to **"Variables"** tab
3. Click **"+ New Variable"**
4. Paste each variable name and value
5. Click **"Add"**

#### **Generate Secure JWT_SECRET:**
```bash
openssl rand -base64 32
```
Copy the output and use it as `JWT_SECRET`.

---

## 🗄️ Database Setup

### **Step 1: Run Migrations**

Railway provides a **one-time job** feature for running migrations:

1. Go to your backend service
2. Click **"Settings"** → **"Deploy"**
3. Add **Custom Start Command:**
   ```bash
   npm run migrate && npm start
   ```
4. Redeploy the service

### **Step 2: Verify Database Schema**

Connect to Railway PostgreSQL using provided credentials:

```bash
# Get connection string from Railway dashboard
psql <DATABASE_URL>

# Verify tables created
\dt

# Should show:
# - users
# - accounts
# - leads
# - sessions
# - messages
# - chasers
# - chaser_rules
# - message_templates
# - compliance_logs
# - lead_activity_log
# - partner_performance
# - reassignment_rules
```

---

## ⏰ Cron Jobs (Automated Background Tasks)

Railway doesn't have built-in cron, but you can use **Railway Cron** plugin or **external cron services**.

### **Option 1: Railway Cron Service (Recommended)**

1. Create a new service in your project
2. Name it `cron-worker`
3. Add this `cron.Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY backend/package*.json ./
RUN npm ci --only=production

COPY backend/dist ./dist

# Install cron
RUN apk add --no-cache dcron

# Add crontab
COPY backend/crontab /etc/crontabs/root

CMD ["crond", "-f", "-l", "2"]
```

4. Create `backend/crontab`:
```bash
# Process pending chasers every 5 minutes
*/5 * * * * curl -X POST https://your-backend.railway.app/api/messaging/process-chasers -H "Authorization: Bearer ADMIN_TOKEN"

# Process automatic lead reassignments every 1 minute
* * * * * curl -X POST https://your-backend.railway.app/api/partners/reassignment/process -H "Authorization: Bearer ADMIN_TOKEN"
```

### **Option 2: External Cron (EasyCron)**

1. Sign up at [easycron.com](https://www.easycron.com) (free tier: 25 crons/month)
2. Create two cron jobs:
   - **Chaser Processing:** Every 5 minutes
   - **Lead Reassignment:** Every 1 minute
3. URL: `https://your-backend.railway.app/api/messaging/process-chasers`
4. Method: `POST`
5. Headers: `Authorization: Bearer <ADMIN_TOKEN>`

---

## 🌐 Frontend Deployment (Vercel)

Railway is for **backend only**. Deploy frontend separately on Vercel:

### **Step 1: Deploy to Vercel**
1. Go to [vercel.com](https://vercel.com)
2. Click **"Import Project"**
3. Select `soloscale-platform` repo
4. Framework: **Vite**
5. Root Directory: `.` (leave blank or root)
6. Build Command: `npm run build`
7. Output Directory: `dist`

### **Step 2: Set Environment Variables**
```bash
VITE_API_URL=https://your-backend.railway.app
```

### **Step 3: Deploy**
Click **"Deploy"** and wait 60 seconds.

---

## 🔧 Post-Deployment Checklist

### **Backend Health Check:**
```bash
curl https://your-backend.railway.app/health
# Expected: { "status": "ok", "timestamp": "..." }
```

### **Database Connection:**
```bash
curl https://your-backend.railway.app/api/leads \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
# Expected: { "leads": [], "pagination": { ... } }
```

### **Cron Jobs Working:**
1. Check Railway logs for cron execution
2. Verify chasers are being sent (check `chasers` table)
3. Verify leads are being reassigned (check `lead_activity_log`)

---

## 📈 Scaling Configuration

### **Auto-Scaling (if needed):**
Railway automatically scales based on load, but you can configure:

1. Go to service **"Settings"** → **"Resources"**
2. Adjust:
   - **vCPU:** 0.5 - 8 cores
   - **Memory:** 512MB - 32GB
   - **Replicas:** 1 - 10 instances

### **Current Recommendation:**
- **Development:** 1 vCPU, 1GB RAM, 1 replica
- **Production (< 1000 leads):** 2 vCPU, 2GB RAM, 1 replica
- **Production (1000-10000 leads):** 4 vCPU, 4GB RAM, 2 replicas

---

## 💰 Cost Estimate

| Service | Resource | Monthly Cost |
|---------|---------|--------------|
| **Backend Service** | 2 vCPU, 2GB RAM | ~$10 |
| **PostgreSQL** | 1GB storage | ~$5 |
| **Redis** | 256MB | ~$3 |
| **Total** | | **~$18/month** |

**Free Tier:** Railway offers $5 free credit/month. You'll pay ~$13/month.

**Comparison:**
- AWS EC2 + RDS: ~$50/month (requires DevOps)
- Heroku: ~$25/month (dying platform)
- Railway: ~$18/month (zero DevOps)

---

## 🛡️ Security Best Practices

### **1. Use Railway Secrets for Sensitive Data**
Never hardcode API keys. Use Railway's environment variables.

### **2. Enable GitHub Auto-Deploy**
1. Go to service **"Settings"** → **"Source"**
2. Enable **"Auto Deploy"**
3. Every `git push` auto-deploys

### **3. Monitor Logs**
Railway logs are real-time. Check for:
- Failed chaser sends
- Reassignment errors
- API authentication failures

### **4. Set Up Alerts** (Optional)
Use Railway's **Slack integration** to get notified of:
- Deploy failures
- Service crashes
- Database connection errors

---

## 🔄 Rollback Strategy

If deployment fails:

1. Go to **"Deployments"** tab
2. Find last working deployment
3. Click **"Redeploy"**
4. Service rolls back in <60 seconds

---

## 📞 Support

- **Railway Docs:** https://docs.railway.app
- **Railway Discord:** https://discord.gg/railway
- **Database Issues:** Railway auto-backups every 24h (restore from dashboard)

---

## ✅ Final Deployment Verification

Run these tests after deployment:

```bash
# 1. Health check
curl https://your-backend.railway.app/health

# 2. Register test user
curl -X POST https://your-backend.railway.app/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","name":"Test User"}'

# 3. Get JWT token from response, then test leads endpoint
curl https://your-backend.railway.app/api/leads \
  -H "Authorization: Bearer <JWT_TOKEN>"

# 4. Test automated chaser processing
curl -X POST https://your-backend.railway.app/api/messaging/process-chasers \
  -H "Authorization: Bearer <JWT_TOKEN>"

# 5. Test automatic reassignment
curl -X POST https://your-backend.railway.app/api/partners/reassignment/process \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

**All 5 tests passing?** ✅ **Your platform is production-ready!**

---

**Deployment Date:** December 28, 2025
**Infrastructure:** Railway (Backend + DB + Redis) + Vercel (Frontend)
**Status:** 🚀 **READY FOR PRODUCTION**
