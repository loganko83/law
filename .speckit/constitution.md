# SafeCon Project Constitution

## Project Identity

**Name**: SafeCon (세이프콘)
**Tagline**: Contract Intelligence & Provenance
**Mission**: "계약, 읽지 않아도 이해하고 믿을 수 있게"

## Core Principles

### 1. User-First Legal Intelligence
- All AI outputs are informational only, not legal advice
- Complex legal terms must be translated to plain language
- Risk assessment must be objective and fact-based

### 2. 3-Layer Defense System
```
Layer 1: AI Translator   - Understand contracts without reading
Layer 2: DID E-Signature - Sign with confidence
Layer 3: Blockchain      - Prove in disputes
```

### 3. Regulatory Compliance
- Korean Attorney Act: AI provides information, not legal advice
- Electronic Signature Act: PKI-based signatures with identity verification
- Personal Information Protection Act (PIPA): Encryption, consent, deletion rights

## Technology Decisions

### Frontend
- React 19 + TypeScript + Vite
- TailwindCSS for styling
- Framer Motion for animations
- TanStack Query for server state

### AI/RAG Stack
- **Primary AI**: Google Gemini API (gemini-3-flash-preview)
- **RAG**: Gemini File Search API for legal document corpus
- **Vector Search**: Semantic search for standard clauses, precedents

### Authentication
- 3-tier: Basic (email) -> Verified (PASS) -> DID (blockchain)

### Deployment
- Server: Ubuntu @ trendy.storydot.kr
- Path: /mnt/storage/law
- Access: SSH with firstkeypair.pem

## Development Standards

### Code Quality
- TypeScript strict mode
- ESLint + Prettier
- All code comments in English
- No Korean text in source code (except i18n files)

### Git Workflow
- main: production
- develop: integration
- feature/*: individual features
- Conventional commits

### Documentation
- spec-kit format for specifications
- CLAUDE.md for AI agent context
- README.md for human developers
