# SafeCon Specification

## Current State Analysis

### Implemented Features (MVP Frontend)

| Feature | Status | Notes |
|---------|--------|-------|
| Home Dashboard | DONE | Contract list, templates, notifications |
| Contract Upload | DONE | Camera scan, file upload (mock analysis) |
| Analysis Report | DONE | Score display, risks, questions (mock data) |
| Contract Detail | DONE | Timeline, parties, status |
| Template Preview | DONE | 9 standard templates |
| DocuSign Simulation | DONE | Draw/Type signature (local only) |
| Legal QA Chat | DONE | Gemini integration with user context |
| Content Proof Generator | DONE | AI-generated legal notices |
| User Profile | DONE | RAG context for personalization |

### Missing Features (Gap Analysis)

#### Critical (MVP Phase 1)

| Feature | Priority | Description |
|---------|----------|-------------|
| Real AI Contract Analysis | P0 | Replace mock analysis with Gemini + RAG |
| Gemini File Search RAG | P0 | Upload legal corpus for semantic search |
| OCR Integration | P1 | Extract text from uploaded images/PDFs |
| Backend API | P1 | FastAPI server for data persistence |
| User Authentication | P1 | JWT-based auth system |

#### Important (MVP Phase 2)

| Feature | Priority | Description |
|---------|----------|-------------|
| Database Integration | P2 | PostgreSQL for contracts, users |
| File Storage | P2 | S3-compatible storage for documents |
| Contract Versioning | P2 | Track document changes |
| Multi-party Signatures | P2 | Support multiple signers |
| PDF Export | P2 | Generate analysis reports as PDF |

#### Future (Phase 2+)

| Feature | Priority | Description |
|---------|----------|-------------|
| DID Integration | P3 | Blockchain-based identity |
| Blockchain Notarization | P3 | Polygon anchoring with Merkle trees |
| PASS Authentication | P3 | Korean identity verification |
| Mobile App | P3 | React Native version |
| B2B API | P3 | External platform integration |

## User Stories

### US-001: Contract Analysis
```
AS A freelancer
I WANT TO upload my contract and get AI analysis
SO THAT I can understand risks before signing
```

**Acceptance Criteria:**
1. Upload PDF/image up to 50MB
2. OCR extracts text with 95%+ accuracy for Korean
3. AI analyzes within 30 seconds
4. Display safety score (0-100)
5. List risk items with explanations
6. Provide negotiation suggestions

### US-002: Legal RAG Q&A
```
AS A user
I WANT TO ask legal questions about my contract
SO THAT I get answers based on relevant laws and precedents
```

**Acceptance Criteria:**
1. Chat interface with conversation history
2. Responses cite relevant standard clauses
3. Personalized based on user profile
4. Clear disclaimer about non-legal advice

### US-003: Content Proof Generation
```
AS A user facing payment issues
I WANT TO generate a formal legal notice
SO THAT I have documentation for potential legal action
```

**Acceptance Criteria:**
1. Form for parties, facts, demands
2. AI generates formal Korean legal notice
3. Copy to clipboard
4. PDF download option

## Technical Requirements

### TR-001: Gemini File Search RAG

**Purpose**: Semantic search over legal document corpus

**Implementation**:
```
1. Create FileSearchStore for legal corpus
2. Upload standard clauses, precedents, regulations
3. Configure chunking (512 tokens, 50 overlap)
4. Query with contract text for relevant context
5. Feed context + contract to Gemini for analysis
```

**Corpus Content**:
- Fair Trade Commission standard contracts
- Ministry of Employment labor contracts
- Ministry of Land real estate contracts
- Supreme Court precedents (contract disputes)
- Key articles from Civil Code, Commercial Code

### TR-002: OCR Pipeline

**Options**:
1. Tesseract.js (browser-based, free)
2. Google Cloud Vision API (high accuracy)
3. Naver Clova OCR (Korean optimized)

**Flow**:
```
Image/PDF -> OCR -> Text extraction -> Clause parsing -> AI analysis
```

### TR-003: Backend Architecture

```
Client (React)
    |
    v
FastAPI Server
    |
    +-- Auth Service (JWT)
    +-- Contract Service (CRUD)
    +-- AI Service (Gemini + RAG)
    +-- Storage Service (S3)
    |
    v
PostgreSQL + Redis
```

## Data Models

### Contract
```typescript
interface Contract {
  id: string;
  userId: string;
  title: string;
  type: ContractType;
  status: ContractStatus;
  partyA: Party;
  partyB: Party;
  documents: Document[];
  analysis?: Analysis;
  timeline: TimelineEvent[];
  createdAt: Date;
  updatedAt: Date;
}
```

### Analysis
```typescript
interface Analysis {
  id: string;
  contractId: string;
  safetyScore: number;
  summary: string;
  clauses: AnalyzedClause[];
  risks: RiskItem[];
  suggestions: string[];
  ragContext: string[]; // Retrieved legal references
  modelVersion: string;
  createdAt: Date;
}
```
