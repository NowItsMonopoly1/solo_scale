# SoloScale - AI-Powered Mortgage Automation Platform

<div align="center">
  <img src="https://img.shields.io/badge/React-18.2.0-blue" alt="React"/>
  <img src="https://img.shields.io/badge/TypeScript-5.0.0-blue" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/Vite-4.0.0-yellow" alt="Vite"/>
  <img src="https://img.shields.io/badge/Fastify-4.0.0-green" alt="Fastify"/>
  <img src="https://img.shields.io/badge/PostgreSQL-15.0-blue" alt="PostgreSQL"/>
  <img src="https://img.shields.io/badge/Redis-7.0-red" alt="Redis"/>
</div>

## 🚀 Overview

SoloScale is a comprehensive AI-powered mortgage automation platform designed for mortgage brokers and financial institutions. It combines advanced document processing, automated messaging, intelligent lead management, and a sophisticated succession layer to ensure business continuity.

### Key Features

- **🤖 AI Document Processing**: Extract and analyze mortgage documents (paystubs, W-2s, bank statements, 1003 forms) with high accuracy
- **📱 Automated Messaging**: Intelligent SMS and email campaigns with personalized templates
- **👥 Lead Management**: Advanced lead scoring, assignment, and tracking with retirement priority analysis
- **🛡️ Succession Layer**: Automated partner reassignment and performance monitoring
- **📊 Health Reports**: Weekly system health reports delivered via email
- **🔐 Role-Based Access Control**: Secure multi-tenant architecture with partner management

## 🏗️ Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Components**: Custom component library
- **State Management**: React Context + localStorage
- **API Client**: Centralized service layer

### Backend
- **Framework**: Fastify (Node.js)
- **Database**: PostgreSQL with connection pooling
- **Cache/Queue**: Redis + BullMQ
- **Authentication**: JWT-based
- **Scheduling**: Node-cron for automated tasks

### AI Integration
- **Document Processing**: Google Gemini AI
- **Chat Interface**: Speed Agent with conversation history
- **Lead Analysis**: Automated urgency scoring
- **SMS Generation**: AI-powered chaser message creation

### Infrastructure
- **Frontend Deployment**: Vercel
- **Backend Deployment**: Railway
- **Database**: Railway PostgreSQL
- **Queue Management**: Redis on Railway

## 📋 Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- Google Gemini API Key
- Twilio Account (for SMS)
- SendGrid Account (for Email)

## 🛠️ Installation

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Configure environment variables
npm run build
npm run start
```

### Frontend Setup

```bash
npm install
cp .env.example .env.local
# Configure VITE_API_URL
npm run dev
```

## 🔧 Environment Variables

### Backend (.env)
```env
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
GEMINI_API_KEY=...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=...
SENDGRID_API_KEY=...
JWT_SECRET=...
```

### Frontend (.env.local)
```env
VITE_API_URL=https://your-backend-url
```

## 🚀 Deployment

### Backend (Railway)
1. Connect GitHub repository
2. Set environment variables
3. Deploy from `main` branch
4. Database migrations run automatically

### Frontend (Vercel)
1. Import project from GitHub
2. Select `main` branch
3. Set `VITE_API_URL` environment variable
4. Deploy

## 📊 Succession Layer

The Succession Layer ensures business continuity through:

- **Automated Reassignment**: Leads automatically reassigned based on partner availability
- **Performance Monitoring**: Real-time tracking of partner metrics
- **Health Reports**: Weekly system status emails
- **RBAC**: Role-based access control for secure operations

### Key Components
- Partner performance dashboard
- Automated lead reassignment logic
- System health monitoring
- Multi-tenant data isolation

## 🤖 AI Features

### Document Processing
- **Supported Formats**: PDF, images, scanned documents
- **Extraction Types**: Paystubs, W-2, bank statements, tax returns, 1003 forms
- **Accuracy**: 95%+ confidence scoring with discrepancy alerts

### Intelligent Messaging
- **Templates**: Pre-built SMS/email templates
- **Personalization**: AI-generated custom messages
- **Automation**: Scheduled follow-ups and chasers

### Lead Intelligence
- **Scoring Algorithm**: Multi-factor analysis including urgency, retirement priority, credit tier
- **Assignment Logic**: Automated distribution based on capacity and expertise
- **Tracking**: Comprehensive conversation and action logging

## 📈 API Endpoints

### AI Services
- `POST /api/ai/extract-document` - Document processing
- `POST /api/ai/chat` - Speed Agent conversations
- `POST /api/ai/analyze-lead-urgency` - Lead scoring
- `POST /api/ai/generate-chaser-sms` - Message generation

### Lead Management
- `GET /api/leads` - List leads with filtering
- `POST /api/leads` - Create new lead
- `PUT /api/leads/:id` - Update lead
- `DELETE /api/leads/:id` - Delete lead

### Messaging
- `POST /api/messaging/send-sms` - Send SMS
- `POST /api/messaging/send-email` - Send email
- `POST /api/messaging/create-chaser` - Schedule follow-up
- `GET /api/messaging/templates` - Get message templates

### Partner Management
- `GET /api/partners/performance` - Performance metrics
- `GET /api/partners/reassignment/pending` - Pending reassignments
- `POST /api/partners/reassignment/:leadId` - Reassign lead

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# API testing
node test-api.js
```

## 📝 Development

### Code Structure
```
├── components/          # React components
├── pages/              # Page components
├── services/           # API services
├── contexts/           # React contexts
├── backend/
│   ├── src/
│   │   ├── api/routes/ # API endpoints
│   │   ├── services/   # Business logic
│   │   ├── db/         # Database schemas
│   │   └── middleware/ # Custom middleware
│   └── config/         # Configuration
└── types/              # TypeScript definitions
```

### Key Workflows
- Document upload → AI processing → Data extraction
- Lead creation → Urgency analysis → Assignment
- Message scheduling → Template selection → Delivery
- System monitoring → Health report generation → Email delivery

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Submit pull request

## 📄 License

Proprietary - SoloScale Platform

## 📞 Support

For technical support or feature requests, please contact the development team.

---

**Built with ❤️ for mortgage professionals**
