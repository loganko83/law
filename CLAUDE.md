# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SafeCon is a Korean legal contract care service (React/TypeScript) providing AI-powered contract analysis, document scanning (OCR), legal Q&A chatbot, contract management, electronic signing simulation, and content proof generation.

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server at http://localhost:3000
npm run build        # Production build (outputs to dist/)
npm run preview      # Preview production build
./scripts/deploy.sh  # Full deploy (build + upload + restart Docker)
```

### Environment Setup
Create `.env.local` with:
```
GEMINI_API_KEY=your_api_key_here
```

## Architecture

### Tech Stack
- **Framework**: React 19 + TypeScript + Vite 6
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

### Services Layer
```
services/
├── geminiClient.ts      # Gemini client, chat sessions, RAG support
├── contractAnalysis.ts  # Two-phase analysis: pattern detection + AI
```

**Analysis Pipeline** (contractAnalysis.ts):
1. `detectPatternRisks()` - Regex matching Korean legal terms (unilateral termination, excessive penalties, IP assignment, unlimited liability, auto-renewal)
2. `analyzeContract()` - Gemini generates JSON with summary, safetyScore, risks[], questions[]
3. `parseAnalysisResponse()` - Merges pattern + AI risks, handles parse failures gracefully

### i18n Configuration
- Locales: `locales/ko/common.json`, `locales/en/common.json`
- Detection order: localStorage > navigator > htmlTag
- Storage key: `safecon-language`
- Use `useTranslation('common')` hook in components

### Mobile-First Design
- Container: `max-w-md mx-auto`
- Bottom nav in Layout.tsx
- Full-screen views bypass Layout

## Deployment

### Production URL
https://trendy.storydot.kr/law/

### Server Access
```bash
ssh -i C:\server\firstkeypair.pem ubuntu@trendy.storydot.kr
# Working directory: /mnt/storage/law
```

### Docker Commands (on server)
```bash
docker-compose up -d --build
docker-compose down
docker logs safecon-frontend
```

### GitHub Actions
Auto-deploys on push to master/main. Secrets required:
- `SSH_PRIVATE_KEY`
- `GEMINI_API_KEY`

## Spec-Kit Documentation

Development specs in `.speckit/`:
- `constitution.md` - Principles and tech decisions
- `specification.md` - Feature requirements
- `implementation-plan.md` - Architecture phases
- `tasks.md` - Sprint tasks
