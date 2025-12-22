# SafeCon Specification v2.0

## Executive Summary

SafeCon is a Korean legal contract care service providing AI-powered contract analysis, DID-based electronic signatures, and blockchain notarization. This specification defines the complete feature set for MVP and future phases.

---

## Current Implementation Status

### Completed Features (Frontend)

| Feature | File | Status |
|---------|------|--------|
| Home Dashboard | `views/Home.tsx` | DONE |
| Contract List | `views/Home.tsx` | DONE |
| Template Gallery | `constants.ts` (9 templates) | DONE |
| AI Contract Analysis (text input) | `services/contractAnalysis.ts` | DONE |
| Risk Pattern Detection | `services/contractAnalysis.ts` (7 patterns) | DONE |
| Analysis Report | `views/Report.tsx` | DONE |
| Contract Detail | `views/ContractDetail.tsx` | DONE |
| Legal QA Chatbot | `views/LegalQA.tsx` | DONE |
| Content Proof Generator | `views/ContentProofGenerator.tsx` | DONE |
| DocuSign Simulation UI | `views/DocuSignSigning.tsx` | DONE (UI only) |
| User Profile (RAG context) | `views/Profile.tsx` | DONE |
| Dark Mode | `contexts/ThemeContext.tsx` | DONE |
| Offline Indicator | `components/OfflineIndicator.tsx` | DONE |
| PWA Support | `services/registerSW.ts` | DONE |
| i18n (Korean/English) | `locales/` | DONE |
| Unit Tests | `tests/unit/` (70 tests) | DONE |

### Missing Features (To Be Implemented)

| Priority | Feature | Phase |
|----------|---------|-------|
| P0 | Backend API (FastAPI) | Phase 1 |
| P0 | Database Schema (PostgreSQL) | Phase 1 |
| P0 | User Authentication (JWT) | Phase 1 |
| P0 | File Upload + OCR | Phase 1 |
| P1 | DID BaaS Integration | Phase 2 |
| P1 | Electronic Signature (real) | Phase 2 |
| P1 | Xphere Blockchain Anchoring | Phase 2 |
| P2 | Merkle Tree Batching | Phase 2 |
| P2 | Certificate Generation | Phase 2 |
| P3 | Subscription/Payment | Phase 3 |
| P3 | B2B API | Phase 3 |

---

## Functional Requirements

### FR-001: AI Contract Analysis

#### FR-001.1: Document Upload
```yaml
Description: Upload contract documents for analysis
Inputs:
  - File: PDF, DOCX, JPG, PNG
  - Max size: 50MB
  - Max pages: 100
Outputs:
  - Extracted text
  - Document metadata
  - Analysis job ID

Acceptance Criteria:
  - [ ] Accept PDF files up to 50MB
  - [ ] Accept DOCX files up to 50MB
  - [ ] Accept image files (JPG/PNG) up to 20MB
  - [ ] Reject unsupported formats with clear error
  - [ ] Show upload progress
  - [ ] Store file securely (encrypted)
```

#### FR-001.2: OCR Processing
```yaml
Description: Extract text from scanned documents and images
Technology: Google Cloud Vision API or Tesseract.js
Accuracy Target: 95%+ for Korean text

Acceptance Criteria:
  - [ ] Extract Korean text with 95%+ accuracy
  - [ ] Handle mixed Korean/English documents
  - [ ] Process 3 seconds per page
  - [ ] Allow manual text correction
```

#### FR-001.3: AI Analysis Engine
```yaml
Description: Analyze contract using Gemini AI with RAG
Model: gemini-3-flash-preview or gemini-2.5-flash
RAG Source: Gemini File Search with legal corpus

Analysis Output:
  summary: String (3 sentences)
  safetyScore: Integer (0-100)
  risks: RiskItem[]
    - id: String
    - title: String (Korean)
    - description: String (Korean)
    - level: HIGH | MEDIUM | LOW
    - clauseReference: String (optional)
    - standardComparison: String
  suggestions: String[]
  questions: String[]

Scoring Criteria:
  0-40: Danger (red)
  41-60: Caution (orange)
  61-80: Conditional Safe (yellow)
  81-100: Safe (green)

Acceptance Criteria:
  - [ ] Complete analysis within 30 seconds for 10 pages
  - [ ] Detect all 7+ risk patterns
  - [ ] Provide Korean explanations in plain language
  - [ ] Include negotiation suggestions
  - [ ] Reference standard contract clauses
```

#### FR-001.4: Risk Pattern Detection (Rule-based)
```yaml
Description: Pre-process contracts with regex pattern matching
Patterns:
  - 일방.*해지|단독.*해제: Unilateral termination (70 points)
  - 지체상금.*[1-9]\d*%: Excessive late fees (75 points)
  - 모든.*지적재산권.*귀속: Broad IP assignment (55 points)
  - 무한.*책임|제한.*없.*손해배상: Unlimited liability (80 points)
  - 자동.*갱신|자동.*연장: Auto-renewal (45 points)
  - 수정.*무한|횟수.*제한.*없: Unlimited revisions (65 points)
  - 60일|90일|Net\s*60: Extended payment terms (50 points)
```

---

### FR-002: User Authentication

#### FR-002.1: Basic Authentication (Email/Password)
```yaml
Description: Standard email/password authentication
Level: Basic (tier 1)
Capabilities:
  - View contracts
  - Limited AI analysis (3/month)
  - No signing capability

Endpoints:
  POST /auth/register
    Request: { email, password, name }
    Response: { userId, email, authLevel: "basic" }

  POST /auth/login
    Request: { email, password }
    Response: { accessToken, refreshToken, user }

  POST /auth/refresh
    Request: { refreshToken }
    Response: { accessToken, refreshToken }

Acceptance Criteria:
  - [ ] Email validation with confirmation
  - [ ] Password strength requirements (8+ chars, mixed)
  - [ ] JWT access token (30 min expiry)
  - [ ] Refresh token rotation
  - [ ] Rate limiting on login attempts
```

#### FR-002.2: DID Authentication (via DID BaaS)
```yaml
Description: Blockchain-based identity using DID BaaS
Level: DID (tier 3)
Capabilities:
  - All Basic features
  - Unlimited AI analysis
  - Electronic signing
  - Blockchain notarization

DID BaaS Integration:
  SDK: @did-baas/sdk
  Base URL: https://trendy.storydot.kr/did-baas/api/v1/

Flow:
  1. User requests DID creation
  2. SafeCon calls DID BaaS sdk.did.issue()
  3. DID anchored on Xphere blockchain
  4. Status: PENDING -> CONFIRMED
  5. User auth level upgraded to "did"

Acceptance Criteria:
  - [ ] Issue DID via DID BaaS SDK
  - [ ] Store DID address in user profile
  - [ ] Verify DID on each sensitive operation
  - [ ] Handle DID revocation
```

---

### FR-003: Electronic Signature (DID-based)

#### FR-003.1: Signature Collection
```yaml
Description: Collect signature using DID-based authentication
Methods:
  - Draw: Canvas-based signature drawing
  - Type: Typed signature with font selection
  - Upload: Image signature upload

Acceptance Criteria:
  - [ ] Canvas drawing with touch/mouse support
  - [ ] 3 signature fonts for typed signatures
  - [ ] Image upload with format validation
  - [ ] Signature preview before confirmation
```

#### FR-003.2: Signature Verification (W3C VC)
```yaml
Description: Create W3C Verifiable Credential for signature
DID BaaS Integration:
  - sdk.credentials.issueW3c()
  - sdk.credentials.verifyW3c()

Credential Structure:
  @context: ["https://www.w3.org/2018/credentials/v1"]
  type: ["VerifiableCredential", "ContractSignatureCredential"]
  issuer: did:sw:safecon:issuer
  credentialSubject:
    contractHash: SHA-256 hash
    signerDid: did:sw:org:signer
    signedAt: ISO timestamp
    signatureImage: base64 (optional)
  proof:
    type: JwtProof2020
    jws: JWT signature

Acceptance Criteria:
  - [ ] Generate W3C compliant VC
  - [ ] Include contract hash in credential
  - [ ] Verify signer DID is valid
  - [ ] Store credential proof on blockchain
```

#### FR-003.3: Multi-party Signing
```yaml
Description: Support multiple signers with ordering
Features:
  - Define signing order
  - Set expiration dates
  - Email notifications
  - Status tracking per party

Acceptance Criteria:
  - [ ] Add 2-10 parties to contract
  - [ ] Define signing order
  - [ ] Send email invitations
  - [ ] Track signature status per party
  - [ ] Lock document after all signatures
```

---

### FR-004: Blockchain Notarization (Xphere)

#### FR-004.1: Document Hashing
```yaml
Description: Generate cryptographic hash of contract
Algorithm: SHA-256 with random salt
Process:
  1. Normalize document text
  2. Generate random salt
  3. Compute SHA-256(document + salt)
  4. Store hash and salt

Acceptance Criteria:
  - [ ] Consistent hash for same document
  - [ ] Salt stored separately for verification
  - [ ] Hash displayed to user
```

#### FR-004.2: Blockchain Anchoring
```yaml
Description: Record document hash on Xphere blockchain
Method: Via DID BaaS (already connected to Xphere)

Two Options:
  A) Use DID BaaS credential issuance (recommended)
     - Issue VC with document hash as claim
     - VC automatically anchored on Xphere

  B) Direct Xphere contract (if separate anchoring needed)
     - Deploy SafeConAnchor.sol
     - Call anchorBatch() with Merkle root

Acceptance Criteria:
  - [ ] Hash recorded on Xphere within 5 minutes
  - [ ] Transaction hash stored in database
  - [ ] Block number recorded
  - [ ] Verification possible via tx hash
```

#### FR-004.3: Merkle Tree Batching
```yaml
Description: Batch multiple hashes for cost optimization
Process:
  1. Collect pending hashes (10 min window)
  2. Build Merkle tree (max 1000 leaves)
  3. Anchor root hash on blockchain
  4. Store Merkle proofs per document

Acceptance Criteria:
  - [ ] Batch processing every 10 minutes
  - [ ] Maximum 1000 documents per batch
  - [ ] Store individual Merkle proofs
  - [ ] Verify document with proof + root
```

#### FR-004.4: Certificate Generation
```yaml
Description: Generate proof certificate for notarized documents
Content:
  - Certificate number (SC-YYYY-NNNNNN)
  - Document hash
  - Merkle root (if batched)
  - Transaction hash
  - Block number
  - Timestamp
  - QR code (verification URL)

Format: PDF with professional design

Acceptance Criteria:
  - [ ] Generate PDF certificate
  - [ ] Include QR code for verification
  - [ ] Downloadable by user
  - [ ] Verify certificate via public URL
```

---

### FR-005: Contract Management

#### FR-005.1: Contract CRUD
```yaml
Description: Basic contract management operations
Endpoints:
  POST /contracts
  GET /contracts
  GET /contracts/{id}
  PATCH /contracts/{id}
  DELETE /contracts/{id}

Acceptance Criteria:
  - [ ] Create contract with metadata
  - [ ] List contracts with pagination
  - [ ] Filter by status, type, date
  - [ ] Update draft contracts
  - [ ] Soft delete (archive)
```

#### FR-005.2: Version Control
```yaml
Description: Track contract document versions
Features:
  - Version numbering (v1, v2, v3...)
  - Change tracking
  - Version comparison
  - Rollback to previous version

Acceptance Criteria:
  - [ ] Auto-increment version on upload
  - [ ] Store all versions
  - [ ] Show version history
  - [ ] Compare two versions (diff)
```

#### FR-005.3: Sharing & Collaboration
```yaml
Description: Share contracts with external parties
Methods:
  - Shareable link (with optional password)
  - Email invitation
  - View-only or sign access

Acceptance Criteria:
  - [ ] Generate shareable link
  - [ ] Optional password protection
  - [ ] Expiration date for links
  - [ ] Track link access
```

---

## Non-Functional Requirements

### NFR-001: Performance
```yaml
Response Times:
  - Page load: < 2 seconds
  - AI analysis: < 30 seconds (10 pages)
  - OCR processing: < 3 seconds/page
  - Blockchain confirmation: < 5 minutes

Scalability:
  - Support 1000 concurrent users
  - Handle 100 analyses/hour
```

### NFR-002: Security
```yaml
Authentication:
  - JWT RS256 with 30-min expiry
  - Refresh token rotation
  - Rate limiting (see tiers below)

Encryption:
  - TLS 1.3 for transport
  - AES-256-GCM for data at rest
  - Field-level encryption for PII

Rate Limits (per tier):
  - Free: 10 requests/minute
  - Basic: 60 requests/minute
  - Pro: 120 requests/minute
```

### NFR-003: Availability
```yaml
Uptime: 99.5% SLA
Backup: Daily database backups
Recovery: < 4 hour RTO
```

---

## Data Models

### User
```typescript
interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  authLevel: 'basic' | 'verified' | 'did';
  didAddress?: string;
  subscriptionTier: 'free' | 'basic' | 'pro';
  profile: UserProfile;
  createdAt: Date;
  updatedAt: Date;
}

interface UserProfile {
  businessType: string;
  businessDescription: string;
  legalConcerns: string;
}
```

### Contract
```typescript
interface Contract {
  id: string;
  userId: string;
  title: string;
  type: ContractType;
  status: ContractStatus;
  parties: ContractParty[];
  documents: ContractDocument[];
  analysis?: ContractAnalysis;
  signatures?: ContractSignature[];
  blockchainRecord?: BlockchainRecord;
  timeline: TimelineEvent[];
  createdAt: Date;
  updatedAt: Date;
}

enum ContractType {
  FREELANCE = 'freelance',
  RENTAL = 'rental',
  EMPLOYMENT = 'employment',
  SERVICE = 'service',
  SALES = 'sales',
  BUSINESS = 'business',
  INVESTMENT = 'investment'
}

enum ContractStatus {
  DRAFT = 'draft',
  REVIEWING = 'reviewing',
  PENDING_SIGNATURE = 'pending_signature',
  SIGNED = 'signed',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  DISPUTE = 'dispute',
  ARCHIVED = 'archived'
}
```

### ContractDocument
```typescript
interface ContractDocument {
  id: string;
  contractId: string;
  version: number;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  contentHash: string;
  ocrText?: string;
  uploadedAt: Date;
}
```

### ContractAnalysis
```typescript
interface ContractAnalysis {
  id: string;
  contractId: string;
  documentId: string;
  safetyScore: number;
  summary: string;
  risks: RiskItem[];
  suggestions: string[];
  questions: string[];
  ragContext: string[];
  modelVersion: string;
  createdAt: Date;
}

interface RiskItem {
  id: string;
  title: string;
  description: string;
  level: 'HIGH' | 'MEDIUM' | 'LOW';
  clauseReference?: string;
  standardComparison?: string;
}
```

### ContractSignature
```typescript
interface ContractSignature {
  id: string;
  contractId: string;
  partyId: string;
  signerDid: string;
  signatureType: 'draw' | 'type' | 'image';
  signatureData: string;
  credentialId: string;
  signedAt: Date;
  verified: boolean;
}
```

### BlockchainRecord
```typescript
interface BlockchainRecord {
  id: string;
  contractId: string;
  documentHash: string;
  salt: string;
  merkleRoot?: string;
  merkleProof?: string[];
  txHash: string;
  blockNumber: number;
  network: string; // 'xphere'
  certificateId?: string;
  status: 'pending' | 'confirmed' | 'failed';
  anchoredAt: Date;
}
```

---

## API Specification

See `.speckit/api-specification.md` for detailed API documentation.

---

## Integration Points

### DID BaaS SDK Usage

```typescript
import { DidBaasSDK } from '@did-baas/sdk';

const sdk = new DidBaasSDK({
  baseUrl: 'https://trendy.storydot.kr/did-baas',
  apiKey: process.env.DID_BAAS_API_KEY
});

// Issue DID for user
const did = await sdk.did.issue({
  metadata: { userId: user.id, type: 'safecon-user' }
});

// Issue signing credential
const credential = await sdk.credentials.issueW3c({
  issuerDid: SAFECON_ISSUER_DID,
  subjectDid: user.didAddress,
  schemaId: 'contract-signature-v1',
  claims: {
    contractHash: documentHash,
    signedAt: new Date().toISOString()
  }
});

// Verify credential
const result = await sdk.credentials.verifyW3c(credential);
```

### Gemini API Usage

```typescript
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Contract analysis with RAG
const response = await ai.models.generateContent({
  model: 'gemini-3-flash-preview',
  contents: analysisPrompt,
  config: {
    tools: [{
      fileSearch: { storeId: LEGAL_CORPUS_STORE_ID }
    }]
  }
});
```
