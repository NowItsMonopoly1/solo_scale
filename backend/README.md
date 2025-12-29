# SoloScale Backend API

Multi-tenant mortgage automation platform backend built with Node.js, TypeScript, and Fastify.

## 🏗️ Architecture

```
backend/
├── src/
│   ├── api/          # API routes and handlers
│   ├── config/       # Configuration management
│   ├── db/           # Database client and migrations
│   ├── services/     # Business logic (AI, messaging, workflows)
│   ├── workers/      # Background job processors
│   ├── types/        # TypeScript types
│   └── utils/        # Utility functions
├── .env.example
├── package.json
└── tsconfig.json
```

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Set Up Environment
```bash
cp .env.example .env
# Edit .env with your credentials
```

### 3. Create Database
```bash
createdb soloscale_dev
psql soloscale_dev < src/db/schema.sql
```

### 4. Run Development Server
```bash
npm run dev
```

API will be available at `http://localhost:3001`

API Documentation: `http://localhost:3001/docs`

## 📡 API Endpoints

### Authentication
- `POST /auth/login` - User login
- `GET /auth/me` - Get current user

### Leads (Multi-tenant)
- `GET /accounts/:accountId/leads` - List leads
- `POST /accounts/:accountId/leads` - Create lead
- `PATCH /accounts/:accountId/leads/:id` - Update lead
- `POST /accounts/:accountId/leads/:id/score` - AI score lead

### Conversations (✅ IMPLEMENTED)
- `POST /accounts/:accountId/conversations` - Create conversation
- `GET /accounts/:accountId/conversations` - List conversations
- `GET /conversations/:id` - Get conversation with messages
- `POST /conversations/:id/close` - Close conversation (generates AI summary)
- `POST /conversations/:id/reopen` - Reopen closed conversation
- `GET /accounts/:accountId/conversations/history` - Get closed conversations
- `POST /conversations/:id/messages` - Add message to conversation

### Workflows
- `GET /accounts/:accountId/workflows` - List workflows
- `POST /accounts/:accountId/workflows` - Create workflow
- `POST /accounts/:accountId/workflows/:id/test` - Test workflow

### Templates
- `GET /accounts/:accountId/templates` - List templates
- `POST /accounts/:accountId/templates` - Create template
- `POST /templates/:id/preview` - Preview template with variables

### Integrations (Webhooks)
- `POST /integrations/floify/webhook` - Floify milestone webhook
- `POST /integrations/salesforce/webhook` - Salesforce event webhook

## 🔐 Security

- JWT-based authentication
- Account-level tenancy isolation
- All secrets server-side only
- Audit logging for all actions

## 📊 Database Schema

See [src/db/schema.sql](src/db/schema.sql) for complete schema.

Key tables:
- `accounts`, `users`, `account_memberships` - Multi-tenancy
- `leads`, `realtors` - Contact management
- `conversations`, `messages` - Communication
- `workflows`, `workflow_runs` - Automation
- `templates` - Message templates
- `audit_logs` - Compliance tracking

## ✅ Implemented Features

### Conversation Lifecycle & Persistence
Complete conversation management system with AI-powered summaries:

**Backend Services:**
- `ConversationService` - Full CRUD operations for conversations
- `AIService` - Multi-provider AI abstraction (Gemini/Claude)
  - Conversation summarization
  - Lead urgency scoring
  - Message compliance checking
- `AuditService` - Comprehensive audit logging

**Database:**
- Enhanced `conversations` table with lifecycle tracking
- Automatic message count updates via triggers
- Migration file: `src/db/migrations/001_add_conversation_lifecycle.sql`

**API Features:**
- Create, list, view conversations
- Close conversation with AI summary generation
- Reopen conversations
- View conversation history
- Add messages to conversations
- Full Swagger/OpenAPI documentation

**Frontend Components:**
- `ConversationHistory.tsx` - Browse closed conversations with summaries
- `ConversationControls.tsx` - Close conversation dialog with reason input
- Integrated with existing React architecture

**Testing:**
- Comprehensive unit tests with Vitest
- Mock implementations for DB and AI services
- Test coverage for all major flows

## 🔧 Next Steps

1. **Install dependencies** - `cd backend && npm install`
2. **Apply migrations** - `psql soloscale_dev < src/db/migrations/001_add_conversation_lifecycle.sql`
3. **Configure environment** - Set `GEMINI_API_KEY` or `ANTHROPIC_API_KEY` in `.env`
4. **Run tests** - `npm test`
5. **Start server** - `npm run dev`
6. **Implement remaining routes** - Leads, workflows, templates
7. **Set up BullMQ workers** - Background job processing
8. **Deploy** - Fly.io or Railway

## 📝 Development Notes

- Use `tsx watch` for hot reload during development
- Run `npm run build` to compile TypeScript
- Use `npm test` to run tests
- Database migrations are manual SQL for now (consider adding migration tool)
