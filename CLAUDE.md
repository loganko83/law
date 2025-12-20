# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SafeCon is a legal contract care service (React/TypeScript) that provides:
- AI-powered contract analysis and risk assessment
- Document scanning (camera OCR) and file upload
- Legal Q&A chatbot with personalized context
- Contract management with timeline tracking
- DocuSign-style electronic signing simulation
- Content proof generation

## Development Commands

```bash
npm install      # Install dependencies
npm run dev      # Start dev server on http://localhost:3000
npm run build    # Production build
npm run preview  # Preview production build
```

## Architecture

### Tech Stack
- **Framework**: React 19 with TypeScript
- **Build**: Vite 6
- **Styling**: Tailwind CSS (inline classes)
- **Animation**: Framer Motion
- **Icons**: Lucide React
- **AI**: Google Gemini API (`@google/genai`)
- **PDF Export**: jspdf + html2canvas

### Project Structure
```
/                     # Root (no src directory)
├── App.tsx           # Main app with state management and routing
├── index.tsx         # React entry point
├── types.ts          # TypeScript types (Contract, UserProfile, ViewState, etc.)
├── constants.ts      # Mock data and standard contract templates
├── components/       # Reusable UI components (Button, Card, Layout)
├── views/            # Full-screen page components
└── vite.config.ts    # Vite config with path alias (@/)
```

### Routing Pattern
The app uses state-based routing via `ViewState` enum in `App.tsx`:
- `currentView` state controls which view renders
- `handleNavigate()` changes views
- No external router library - all views switch via `setCurrentView()`

### State Management
- All global state lives in `App.tsx` (useState hooks)
- `contracts`, `selectedContract`, `userProfile`, `currentAnalysis`
- Props drilled down to views; no external state library

### Key Types
- `Contract`: Core entity with status, analysis, timeline
- `ContractAnalysis`: AI analysis result with risks, score, questions
- `UserProfile`: RAG context for personalized AI responses
- `ViewState`: Union type for all possible views

### AI Integration
Views use Google Gemini API directly via `@google/genai`:
- API key from `process.env.GEMINI_API_KEY` (set in `.env.local`)
- `LegalQA.tsx` and `ContentProofGenerator.tsx` use chat completions
- User profile context injected as system instructions for personalization

### Mobile-First Design
- Max-width container (`max-w-md mx-auto`)
- Bottom navigation bar (Layout.tsx)
- Full-screen views bypass Layout for immersive experience

### Services Layer
```
services/
├── geminiClient.ts      # Gemini API client with RAG support
├── contractAnalysis.ts  # AI contract analysis with risk detection
```

## AI Contract Analysis

The analysis pipeline:
1. **Pattern Detection**: Rule-based risk pattern matching (Korean legal terms)
2. **AI Analysis**: Gemini generates structured analysis with scores
3. **RAG (Future)**: Semantic search over legal corpus for context

Risk patterns detected:
- Unilateral termination clauses
- Excessive penalties (late fees, damages)
- IP assignment issues
- Unlimited liability
- Auto-renewal without notice

## Deployment

### Server
- Host: trendy.storydot.kr
- Path: /mnt/storage/law
- Access: SSH with firstkeypair.pem

### Commands
```bash
# Local development
npm run dev

# Build for production
npm run build

# Deploy (requires SSH access)
./scripts/deploy.sh

# Docker commands on server
docker-compose up -d --build
docker-compose down
docker logs safecon-frontend
```

### GitHub Actions
Automatic deployment on push to master branch.
Required secrets:
- `SSH_PRIVATE_KEY`: Server SSH private key
- `GEMINI_API_KEY`: Google Gemini API key

## Spec-Kit Documentation

Development specifications are in `.speckit/`:
- `constitution.md` - Project principles and tech decisions
- `specification.md` - Feature requirements and gaps
- `implementation-plan.md` - Architecture and phases
- `tasks.md` - Sprint task breakdown
