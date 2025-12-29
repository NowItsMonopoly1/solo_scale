# 🚀 SoloScale Launch Ready Manual

## Overview
SoloScale is now production-ready with full automation infrastructure. This manual covers deployment, operations, and scaling.

## 🚂 Railway Deployment

### Prerequisites
- Railway account with PostgreSQL and Redis services
- Domain: `primusinsights.com` configured

### Environment Variables
Set these in Railway Dashboard > Project > Variables:

```
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_URL=redis://host:6379
SENDGRID_API_KEY=SG.your-sendgrid-key
GEMINI_API_KEY=your-gemini-key
JWT_SECRET=high-entropy-random-string
SYSTEM_ADMIN_EMAIL=admin@primusinsights.com
STALE_THRESHOLD_MINUTES=15
```

### Deployment Steps
1. Connect GitHub repo to Railway
2. Railway auto-detects `railway.json` and builds
3. Monitor logs for successful startup
4. Test health endpoint: `GET /api/system/health-metrics`

## 📊 Friday Health Reports

### Automation Details
- **Schedule**: Every Friday at 5:00 PM EST
- **Recipients**: All account owners + system admin
- **Content**: Lead metrics, AI savings, team performance

### Manual Controls
- **Pause Reports**: Set `DISABLE_HEALTH_REPORTS=true` in env vars
- **Trigger Manually**: `POST /api/system/health-report`
- **Adjust Schedule**: Modify cron in `backend/src/services/healthReportScheduler.ts`

## ⚙️ Succession Layer Operations

### Lead Reassignment
- **Default Timer**: 15 minutes of inactivity
- **Override**: Update `STALE_THRESHOLD_MINUTES` in env vars
- **Manual Reassign**: `POST /api/partners/reassignment/:leadId`

### RBAC Management
- **Roles**: senior_partner, junior_broker, admin
- **Permissions**: Automatic based on role hierarchy
- **Audit**: All changes logged in `lead_activity_log`

## 📈 Scaling Guide

### Adding New Tenants
1. Create new account in database
2. Provision isolated data schema
3. Configure tenant-specific env vars
4. Update DNS for subdomain (e.g., tenant.soloscale.com)

### Performance Optimization
- **Database**: Monitor query performance, add indexes as needed
- **Redis**: Enable for document processing queues
- **Caching**: Implement Redis for frequent API calls

## 🔧 Troubleshooting

### Common Issues
- **Redis Connection**: System runs without it (graceful fallback)
- **Email Failures**: Check SendGrid API key and quota
- **Lead Processing**: Verify Gemini API key and rate limits

### Logs
- Railway logs: Real-time deployment and runtime
- Application logs: Structured via Winston logger
- Health metrics: Available at `/api/system/health-metrics`

## 📞 Support
- **System Admin**: Contact via `SYSTEM_ADMIN_EMAIL`
- **Documentation**: This file and inline code comments
- **Updates**: Monitor GitHub repo for changes

## 🎯 Success Metrics
- **Uptime**: >99.9% (Railway SLA)
- **Report Delivery**: 100% success rate
- **Lead Processing**: <5 min average
- **User Adoption**: >80% feature utilization

SoloScale is now live and self-sustaining. The platform will grow with your business while maintaining the "retirement-ready" automation you built.