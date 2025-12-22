# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SafeCon is a Korean legal contract care service providing AI-powered contract analysis, DID-based identity verification, blockchain-anchored signatures, and document management.

## Development Commands

### Frontend
```bash
npm install          # Install dependencies
npm run dev          # Start dev server at http://localhost:3000
npm run build        # Production build (outputs to dist/)
npm run preview      # Preview production build at http://localhost:4173
```

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000   # Start API server
alembic upgrade head                         # Run migrations
alembic revision --autogenerate -m "msg"     # Create migration
pytest                                        # Run backend tests
```

### Docker (Full Stack)
```bash
docker compose up -d --build    # Start all services
docker compose down             # Stop all services
docker logs safecon-api         # View backend logs
```

### Testing
```bash
# Frontend
npm test                    # Unit tests in watch mode
npm run test:unit           # Unit tests once
npm run test:coverage       # With coverage report
npm run test:e2e            # Playwright E2E tests (requires build)
npx vitest run tests/unit/components/Button.test.tsx  # Single file

# Backend
cd backend && pytest tests/ -v
```

### Environment Setup
Frontend `.env.local`:
```
GEMINI_API_KEY=your_api_key_here
```

Backend `.env` (or via docker-compose):
```
DATABASE_URL=postgresql+asyncpg://safecon:safecon@localhost:5432/safecon
REDIS_URL=redis://localhost:6379/0
JWT_SECRET_KEY=your-secret-key
GEMINI_API_KEY=your_api_key_here
DID_BAAS_URL=https://trendy.storydot.kr/did-baas/api/v1
```

## Architecture

### Tech Stack
- **Frontend**: React 19 + TypeScript + Vite 6
- **Backend**: FastAPI + PostgreSQL + Redis (in `backend/`)
- **Styling**: Tailwind CSS (inline classes)
- **Animation**: Framer Motion
- **AI**: Google Gemini API (`@google/genai`) - models: gemini-2.5-flash, gemini-3-flash-preview
- **i18n**: react-i18next (Korean/English, fallback: ko)
- **PDF**: jspdf + html2canvas

### Routing Pattern
State-based routing via `ViewState` enum in `App.tsx`:
- `currentView` state controls which view renders
- `handleNavigate(view)` changes views with scroll reset
- No router library - views switch via `setCurrentView()`
- Full-screen views (DETAIL, DOCUMENT, LEGAL_QA, etc.) render without Layout

### State Management
All global state in `App.tsx` via useState hooks:
- `contracts`, `selectedContract`, `currentAnalysis`
- `userProfile` - RAG context injected into AI prompts for personalization
- Props drilled to views; no external state library

### Key Types (types.ts)
- `Contract`: Core entity with status, analysis, timeline
- `ContractAnalysis`: AI result with risks[], score, questions[]
- `UserProfile`: businessType, businessDescription, legalConcerns for RAG
- `ViewState`: Union of 12 view states (HOME, UPLOAD, REPORT, DETAIL, etc.)

### Frontend Services
```
services/
├── geminiClient.ts       # Gemini client, chat sessions, RAG support
├── contractAnalysis.ts   # Two-phase analysis: pattern detection + AI
├── conversationStorage.ts # Chat history persistence (localStorage)
├── registerSW.ts         # PWA service worker, offline detection
├── api.ts                # Backend API client
```

**Analysis Pipeline** (contractAnalysis.ts):
1. `detectPatternRisks()` - Regex matching Korean legal terms
2. `analyzeContract()` - Gemini generates JSON with summary, safetyScore, risks[], questions[]
3. `parseAnalysisResponse()` - Merges pattern + AI risks, handles parse failures gracefully

### Backend Structure
```
backend/app/
├── api/           # FastAPI routers (auth, contracts, analysis, did, signatures, blockchain, etc.)
├── models/        # SQLAlchemy models (user, contract, signature, subscription, template)
├── schemas/       # Pydantic schemas for request/response validation
├── services/      # Business logic (ai_analyzer, did_baas)
├── core/          # Config, security, database setup
├── crud/          # Database operations
└── db/            # Database initialization, seeds
```

**Backend API Endpoints** (12 routers):
- `/auth` - JWT authentication, user management
- `/contracts` - Contract CRUD, file upload
- `/analysis` - AI-powered contract analysis
- `/did` - DID issuance/verification via DID BaaS
- `/signatures` - Electronic signature management
- `/blockchain` - Xphere blockchain anchoring
- `/parties` - Multi-party contract management
- `/versions` - Contract version history
- `/sharing` - Secure contract sharing
- `/templates` - Contract templates
- `/subscriptions` - User subscription plans
- `/b2b` - B2B API endpoints

### Context Providers
- `ThemeProvider` (contexts/ThemeContext.tsx) - Dark/light/system theme with localStorage persistence
- `ToastProvider` (components/Toast.tsx) - Toast notifications

### i18n Configuration
- Locales: `locales/ko/common.json`, `locales/en/common.json`
- Storage key: `safecon-language`
- Use `useTranslation('common')` hook in components

### Mobile-First Design
- Container: `max-w-md mx-auto`
- Bottom nav in Layout.tsx
- Full-screen views bypass Layout

## Testing Structure

```
tests/
├── setup.ts              # Test setup with mocks (localStorage, matchMedia, i18n)
├── unit/                 # Vitest unit tests
│   ├── components/       # Component tests
│   ├── contexts/         # Context tests
│   └── services/         # Service tests
└── e2e/                  # Playwright E2E tests (Mobile Chrome viewport)
```

## Deployment

### Production URL
https://trendy.storydot.kr/law/

### Docker Containers
| Container | Port | Description |
|-----------|------|-------------|
| safecon-frontend | 3000→80 | React app (nginx) |
| safecon-api | 8000 | FastAPI backend |
| safecon-db | 5432 | PostgreSQL 16 |
| safecon-redis | 6379 | Redis 7 |

### Server Access
```bash
ssh -i C:\server\firstkeypair.pem ubuntu@trendy.storydot.kr
cd /mnt/storage/law
```

### GitHub Actions
Auto-deploys on push to master/main. Secrets: `SSH_PRIVATE_KEY`, `GEMINI_API_KEY`

## Spec-Kit Documentation

Development specs in `.speckit/`:
- `constitution.md` - Project principles and tech decisions
- `specification.md` - Feature requirements (FR-001..005)
- `implementation-plan.md` - Phase-by-phase development plan
- `tasks.md` - 147 actionable tasks with priorities
- `api-specification.md` - Complete API documentation

## External Service Integration

### DID BaaS (Decentralized Identity)
```
Base URL: https://trendy.storydot.kr/did-baas/api/v1/
Swagger: https://trendy.storydot.kr/did-baas/api/swagger-ui.html
Server Path: /mnt/storage/did_baas

Features:
- DID Issue/Verify/Revoke (W3C DID Core 1.0)
- W3C Verifiable Credentials
- Zero-Knowledge Proofs
- BBS+ Selective Disclosure
```

### Xphere Blockchain
```
Network: Xphere Mainnet
Chain ID: 20250217
Type: EVM-compatible
Used by: DID BaaS for credential anchoring
```

### Gemini AI
```
Models: gemini-3-flash-preview, gemini-2.5-flash
Features: Contract analysis, RAG with File Search
```

## Development Phases

| Phase | Focus | Status |
|-------|-------|--------|
| Phase 1 | Backend Foundation (FastAPI, Auth, CRUD) | Pending |
| Phase 2 | DID & Blockchain (DID BaaS, Signatures, Xphere) | Pending |
| Phase 3 | Advanced (Merkle, Multi-party, Versioning) | Pending |
| Phase 4 | Monetization (Subscriptions, B2B API) | Pending |
