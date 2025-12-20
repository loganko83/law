# SafeCon Project Constitution

## Project Identity

**Name**: SafeCon (세이프콘)
**Tagline**: Contract Intelligence & Provenance
**Mission**: "계약, 읽지 않아도 이해하고 믿을 수 있게" / "Understand and trust contracts without reading every line"

## Core Principles

### 1. User-First Legal Intelligence
- All AI outputs are informational only, not legal advice
- Complex legal terms must be translated to plain language
- Risk assessment must be objective and fact-based
- Support multiple languages (Korean primary, English secondary)

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
- i18next for internationalization (ko/en)
- TanStack Query for server state

### AI/RAG Stack
- **Primary AI**: Google Gemini API (gemini-2.5-flash)
- **RAG**: Gemini File Search API for legal document corpus
- **Vector Search**: Semantic search for standard clauses, precedents
- **API Key**: Environment variable GEMINI_API_KEY

### Internationalization
- Default language: Korean (ko)
- Supported languages: Korean, English
- Translation files: `/locales/{lang}/common.json`
- Language detection: Browser preference with localStorage override

### Authentication
- 3-tier: Basic (email) -> Verified (PASS) -> DID (blockchain)

### Deployment
- Server: Ubuntu @ trendy.storydot.kr
- Path: /mnt/storage/law
- Access: SSH with firstkeypair.pem
- CI/CD: GitHub Actions

## Development Standards

### Code Quality
- TypeScript strict mode
- ESLint + Prettier
- All code comments in English
- No hardcoded Korean text in source code (use i18n keys)

### Git Workflow
- main/master: production
- develop: integration
- feature/*: individual features
- Conventional commits

### Documentation
- `.specify/` for spec-kit specifications
- `CLAUDE.md` for AI agent context
- `README.md` for human developers
