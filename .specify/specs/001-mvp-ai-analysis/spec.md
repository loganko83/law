# Feature Spec: MVP AI Contract Analysis

## Overview

Build the core AI contract analysis feature that allows users to upload contracts and receive risk assessments powered by Google Gemini with RAG capabilities.

## User Stories

### US-001: Contract Upload and Analysis
```
AS A user (freelancer, tenant, employee)
I WANT TO upload my contract document
SO THAT I can understand potential risks before signing
```

**Acceptance Criteria:**
1. Support file upload: PDF, images (JPG, PNG), text files
2. Support camera capture for document scanning
3. Extract text via OCR for images
4. Display analysis within 30 seconds
5. Show safety score (0-100) with visual indicator
6. List identified risks with severity levels
7. Provide suggested questions to ask counterparty

### US-002: Multilingual Support
```
AS A user
I WANT TO use the app in my preferred language
SO THAT I can understand all features regardless of language
```

**Acceptance Criteria:**
1. Support Korean (default) and English
2. Language switcher accessible from home screen
3. All UI text translated
4. AI responses in user's selected language
5. Persist language preference

### US-003: Legal Q&A Chat
```
AS A user with questions about my contract
I WANT TO ask the AI legal questions
SO THAT I get context-aware answers based on my profile
```

**Acceptance Criteria:**
1. Chat interface with conversation history
2. Personalized responses based on user profile (business type, concerns)
3. Citations from legal knowledge base when available
4. Clear disclaimer about non-legal advice nature

## Technical Requirements

### TR-001: Gemini Integration
- Use Google Gemini API via `@google/genai` package
- Model: gemini-2.5-flash for analysis, gemini-3-flash-preview for chat
- API key from environment variable

### TR-002: RAG with Gemini File Search
- Create FileSearchStore for legal document corpus
- Upload standard contracts, regulations, precedents
- Use semantic search for relevant context
- Inject context into analysis prompts

### TR-003: i18n Implementation
- Use i18next with react-i18next
- Translation files in `/locales/{lang}/common.json`
- Language detector with localStorage persistence
- Fallback to Korean

### TR-004: Risk Pattern Detection
- Rule-based pre-filtering for common risk patterns
- Korean legal term patterns (unilateral termination, excessive penalties)
- Combine with AI analysis for comprehensive results

## Data Models

```typescript
interface ContractAnalysis {
  summary: string;
  score: number; // 0-100
  risks: RiskPoint[];
  questions: string[];
}

interface RiskPoint {
  id: string;
  title: string;
  description: string;
  level: 'HIGH' | 'MEDIUM' | 'LOW';
}
```

## UI Components

1. **Upload View**: Camera scan, file upload, progress indicator
2. **Analysis View**: Score display, risk cards, question list
3. **Language Switcher**: Compact toggle in header

## Out of Scope (Phase 2+)
- Backend API persistence
- User authentication
- Document storage
- Blockchain notarization
- Electronic signatures
