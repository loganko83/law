# SafeCon Task Breakdown v2.1

## Overview

This document contains all actionable tasks organized by phase and sprint.
Each task includes priority, effort estimate, and dependencies.

**Status Legend**:
- `[ ]` Not started
- `[~]` In progress
- `[x]` Complete
- `[-]` Blocked

**Priority**: P0=Critical, P1=High, P2=Medium, P3=Low

**Effort**: XS=<1hr, S=1-2hr, M=4-8hr, L=1-2days, XL=3-5days

---

## Phase 0: System Hardening (NEW - 2024-12-23)

### Sprint 0.1: Critical Security Fixes (1 day)

| ID | Task | Priority | Effort | Status | Dependencies |
|----|------|----------|--------|--------|--------------|
| SEC-001 | Move Gemini API calls to backend proxy | P0 | M | [x] | - |
| SEC-002 | Remove hardcoded DB credentials from docker-compose | P0 | S | [x] | - |
| SEC-003 | Add JWT secret validation on startup | P0 | S | [x] | - |
| SEC-004 | Disable DEBUG mode in production | P0 | XS | [x] | - |
| SEC-005 | Add file upload MIME type validation | P0 | S | [ ] | DOC-003 |
| SEC-006 | Remove exposed database ports in production | P1 | XS | [x] | - |

**Files to Modify**:
```
docker-compose.yml
backend/app/core/config.py
backend/app/api/documents.py
services/geminiClient.ts (remove or proxy)
```

---

### Sprint 0.2: Bug Fixes (1 day)

| ID | Task | Priority | Effort | Status | Dependencies |
|----|------|----------|--------|--------|--------------|
| BUG-001 | Fix AuthContext infinite loop (refreshUser dependency) | P0 | S | [x] | - |
| BUG-002 | Fix memory leak in OfflineIndicator (setTimeout cleanup) | P1 | XS | [ ] | - |
| BUG-003 | Fix Report.tsx interval cleanup on score change | P1 | XS | [ ] | - |
| BUG-004 | Add error handling to Upload.tsx fetch operations | P1 | S | [ ] | - |
| BUG-005 | Fix pagination count query (use func.count) | P1 | S | [ ] | - |

**Files to Modify**:
```
contexts/AuthContext.tsx
components/OfflineIndicator.tsx
views/Report.tsx
views/Upload.tsx
backend/app/api/contracts.py
```

---

### Sprint 0.3: Deployment Fixes (1 day)

| ID | Task | Priority | Effort | Status | Dependencies |
|----|------|----------|--------|--------|--------------|
| DEP-001 | Include backend/ directory in deploy script | P0 | S | [x] | - |
| DEP-002 | Add pre-deployment test step in CI/CD | P1 | S | [x] | - |
| DEP-003 | Add health check validation after deployment | P1 | S | [x] | - |
| DEP-004 | Fix VITE_API_URL for production environment | P0 | S | [x] | - |
| DEP-005 | Add non-root user to Docker containers | P1 | S | [ ] | - |

**Files to Modify**:
```
.github/workflows/deploy.yml
docker-compose.yml
backend/Dockerfile
Dockerfile
```

---

### Sprint 0.4: Code Quality (2 days)

| ID | Task | Priority | Effort | Status | Dependencies |
|----|------|----------|--------|--------|--------------|
| I18N-001 | Convert App.tsx Korean text to i18n keys | P0 | M | [x] | - |
| I18N-002 | Convert constants.ts templates to i18n | P1 | L | [ ] | I18N-001 |
| TYPE-001 | Replace `any` types with proper interfaces | P1 | S | [ ] | - |
| TYPE-002 | Add missing type hints in Python backend | P2 | M | [ ] | - |
| PERF-001 | Add useMemo to Home.tsx filteredTemplates | P2 | XS | [ ] | - |
| PERF-002 | Extract and memoize NavButton component | P2 | S | [ ] | - |
| PERF-003 | Add DB indexes for user_id and created_at | P1 | S | [ ] | - |
| A11Y-001 | Add ARIA labels to buttons and interactive elements | P2 | M | [ ] | - |
| DUP-001 | Extract PDF export to shared utility | P2 | M | [ ] | - |

**Files to Modify**:
```
App.tsx
constants.ts
views/Home.tsx
views/ContractDetail.tsx
views/Report.tsx
components/Layout.tsx
locales/ko/common.json
locales/en/common.json
backend/app/models/contract.py
```

---

### Sprint 0.5: Infrastructure (1 day)

| ID | Task | Priority | Effort | Status | Dependencies |
|----|------|----------|--------|--------|--------------|
| INFRA-001 | Add Rate Limiting middleware (Redis) | P0 | M | [ ] | BE-005 |
| INFRA-002 | Implement blockchain process_anchor function | P1 | L | [ ] | - |
| INFRA-003 | Add resource limits to Docker containers | P1 | S | [ ] | - |
| INFRA-004 | Add HTTPS/SSL to nginx configuration | P1 | M | [ ] | - |

**Files to Modify**:
```
backend/app/main.py
backend/app/api/blockchain.py
docker-compose.yml
nginx.conf
```

---

### Phase 0 Summary

| Sprint | Total | P0 | P1 | P2 |
|--------|-------|----|----|----
| 0.1 Security | 6 | 5 | 1 | 0 |
| 0.2 Bug Fixes | 5 | 1 | 4 | 0 |
| 0.3 Deployment | 5 | 2 | 3 | 0 |
| 0.4 Code Quality | 9 | 1 | 4 | 4 |
| 0.5 Infrastructure | 4 | 1 | 3 | 0 |
| **Total** | **29** | **10** | **15** | **4** |

---

## Phase 1: Backend Foundation

### Sprint 1.1: Project Setup (3 days)

| ID | Task | Priority | Effort | Status | Dependencies |
|----|------|----------|--------|--------|--------------|
| BE-001 | Initialize FastAPI project structure | P0 | M | [x] | - |
| BE-002 | Create config.py with environment loading | P0 | S | [x] | BE-001 |
| BE-003 | Set up SQLAlchemy with async support | P0 | M | [x] | BE-001 |
| BE-004 | Configure Alembic migrations | P0 | M | [x] | BE-003 |
| BE-005 | Create Redis connection service | P1 | S | [ ] | BE-001 |
| BE-006 | Set up Docker Compose (postgres, redis) | P0 | M | [x] | - |
| BE-007 | Configure logging (structlog) | P1 | S | [x] | BE-001 |
| BE-008 | Create requirements.txt | P0 | XS | [x] | BE-001 |
| BE-009 | Create Dockerfile for backend | P1 | S | [x] | BE-001 |
| BE-010 | Standardized error handling system | P1 | M | [x] | BE-001 |

**Sprint 1.1 Deliverables**:
```bash
backend/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── config.py
│   └── database.py
├── requirements.txt
├── Dockerfile
└── docker-compose.yml
```

---

### Sprint 1.2: User Authentication (5 days)

| ID | Task | Priority | Effort | Status | Dependencies |
|----|------|----------|--------|--------|--------------|
| AUTH-001 | Create User SQLAlchemy model | P0 | M | [x] | BE-003 |
| AUTH-002 | Create UserProfile embedded model | P0 | S | [x] | AUTH-001 |
| AUTH-003 | Create Pydantic schemas (UserCreate, UserResponse) | P0 | S | [x] | AUTH-001 |
| AUTH-004 | Implement bcrypt password hashing | P0 | S | [x] | - |
| AUTH-005 | Generate RS256 JWT key pair | P0 | S | [x] | - |
| AUTH-006 | Create JWT token service | P0 | M | [x] | AUTH-005 |
| AUTH-007 | Implement refresh token rotation | P0 | M | [x] | AUTH-006 |
| AUTH-008 | Create POST /auth/register endpoint | P0 | M | [x] | AUTH-003, AUTH-004 |
| AUTH-009 | Create POST /auth/login endpoint | P0 | M | [x] | AUTH-006 |
| AUTH-010 | Create POST /auth/refresh endpoint | P0 | M | [x] | AUTH-007 |
| AUTH-011 | Create POST /auth/logout endpoint | P1 | S | [ ] | AUTH-006 |
| AUTH-012 | Add rate limiting middleware (Redis) | P1 | M | [ ] | BE-005 |
| AUTH-013 | Create auth dependency (get_current_user) | P0 | S | [x] | AUTH-006 |
| AUTH-014 | Write unit tests for auth | P1 | L | [x] | AUTH-008..011 |

**Files to Create**:
```
backend/app/models/user.py
backend/app/schemas/user.py
backend/app/services/auth.py
backend/app/api/v1/auth.py
backend/app/api/deps.py
backend/app/utils/security.py
```

---

### Sprint 1.3: Contract CRUD (5 days)

| ID | Task | Priority | Effort | Status | Dependencies |
|----|------|----------|--------|--------|--------------|
| CTR-001 | Create Contract SQLAlchemy model | P0 | M | [x] | BE-003 |
| CTR-002 | Create ContractType enum | P0 | XS | [x] | - |
| CTR-003 | Create ContractStatus enum | P0 | XS | [x] | - |
| CTR-004 | Create ContractDocument model | P0 | M | [x] | CTR-001 |
| CTR-005 | Create ContractParty model | P1 | S | [x] | CTR-001 |
| CTR-006 | Create TimelineEvent model | P1 | S | [ ] | CTR-001 |
| CTR-007 | Create Pydantic schemas for Contract | P0 | M | [x] | CTR-001..006 |
| CTR-008 | Create POST /contracts endpoint | P0 | M | [x] | CTR-007 |
| CTR-009 | Create GET /contracts endpoint (list) | P0 | M | [x] | CTR-007 |
| CTR-010 | Add pagination (limit/offset) | P0 | S | [x] | CTR-009 |
| CTR-011 | Add filtering (status, type, date) | P1 | M | [x] | CTR-009 |
| CTR-012 | Create GET /contracts/{id} endpoint | P0 | S | [x] | CTR-007 |
| CTR-013 | Create PATCH /contracts/{id} endpoint | P0 | M | [x] | CTR-007 |
| CTR-014 | Create DELETE /contracts/{id} (soft delete) | P0 | S | [x] | CTR-007 |
| CTR-015 | Write unit tests for contracts | P1 | L | [x] | CTR-008..014 |

**Files to Create**:
```
backend/app/models/contract.py
backend/app/models/document.py
backend/app/schemas/contract.py
backend/app/api/v1/contracts.py
```

---

### Sprint 1.4: File Upload & OCR (5 days)

| ID | Task | Priority | Effort | Status | Dependencies |
|----|------|----------|--------|--------|--------------|
| DOC-001 | Create S3/MinIO storage service | P0 | M | [x] | BE-001 |
| DOC-002 | Configure storage bucket and credentials | P0 | S | [x] | DOC-001 |
| DOC-003 | Create file upload endpoint | P0 | M | [x] | DOC-001, CTR-004 |
| DOC-004 | Implement file type validation | P0 | S | [x] | DOC-003 |
| DOC-005 | Implement file size validation (50MB max) | P0 | S | [x] | DOC-003 |
| DOC-006 | Create SHA-256 hash utility | P0 | S | [x] | - |
| DOC-007 | Generate content hash on upload | P0 | S | [x] | DOC-006 |
| DOC-008 | Create OCR service interface | P0 | S | [x] | - |
| DOC-009 | Integrate Google Cloud Vision API | P1 | M | [ ] | DOC-008 |
| DOC-010 | Alternative: Integrate Tesseract (self-hosted) | P2 | L | [x] | DOC-008 |
| DOC-011 | Extract text and store in database | P0 | M | [x] | DOC-009 |
| DOC-012 | Create GET /documents/{id} endpoint | P1 | S | [x] | CTR-004 |
| DOC-013 | Create presigned URL for download | P1 | M | [x] | DOC-001 |
| DOC-014 | Write unit tests for documents | P1 | M | [ ] | DOC-003..013 |

**Files to Create**:
```
backend/app/services/storage.py
backend/app/services/ocr.py
backend/app/api/v1/documents.py
backend/app/utils/hash.py
```

---

### Sprint 1.5: AI Analysis Integration (5 days)

| ID | Task | Priority | Effort | Status | Dependencies |
|----|------|----------|--------|--------|--------------|
| AI-001 | Create Gemini client service | P0 | M | [x] | BE-001 |
| AI-002 | Migrate risk patterns from frontend | P0 | S | [ ] | AI-001 |
| AI-003 | Create ContractAnalysis model | P0 | M | [x] | BE-003 |
| AI-004 | Create RiskItem embedded model | P0 | S | [x] | AI-003 |
| AI-005 | Create Pydantic schemas for Analysis | P0 | S | [x] | AI-003 |
| AI-006 | Create analysis prompt template | P0 | M | [x] | AI-001 |
| AI-007 | Create POST /analysis endpoint | P0 | M | [x] | AI-001..006 |
| AI-008 | Implement pattern detection | P0 | M | [ ] | AI-002 |
| AI-009 | Combine AI + pattern results | P0 | M | [ ] | AI-007, AI-008 |
| AI-010 | Create GET /analysis/{id} endpoint | P0 | S | [x] | AI-003 |
| AI-011 | Add async background task option | P2 | L | [x] | AI-007 |
| AI-012 | Write unit tests for analysis | P1 | M | [ ] | AI-007..010 |

**Files to Create**:
```
backend/app/services/gemini.py
backend/app/models/analysis.py
backend/app/schemas/analysis.py
backend/app/api/v1/analysis.py
```

---

### Sprint 1.6: Frontend Integration (4 days)

| ID | Task | Priority | Effort | Status | Dependencies |
|----|------|----------|--------|--------|--------------|
| FE-001 | Create API client service (axios) | P0 | M | [x] | - |
| FE-002 | Add auth interceptor for JWT | P0 | S | [x] | FE-001 |
| FE-003 | Add refresh token interceptor | P0 | M | [x] | FE-002 |
| FE-004 | Create AuthContext with state | P0 | M | [x] | FE-001 |
| FE-005 | Create Login view | P0 | M | [x] | FE-004 |
| FE-006 | Create Register view | P0 | M | [x] | FE-004 |
| FE-007 | Add auth routes to App.tsx | P0 | S | [x] | FE-005, FE-006 |
| FE-008 | Update Upload.tsx to use API | P0 | M | [ ] | FE-001 |
| FE-009 | Update Report.tsx to fetch from API | P0 | M | [ ] | FE-001 |
| FE-010 | Update Home.tsx to fetch contracts | P0 | M | [ ] | FE-001 |
| FE-011 | Update ContractDetail.tsx for API | P0 | M | [ ] | FE-001 |
| FE-012 | Add loading states throughout | P1 | M | [ ] | FE-008..011 |
| FE-013 | Add error handling throughout | P1 | M | [ ] | FE-008..011 |
| FE-014 | E2E testing of complete flow | P1 | L | [ ] | All above |

**Files to Create**:
```
src/services/api.ts
src/contexts/AuthContext.tsx
src/views/Login.tsx
src/views/Register.tsx
```

**Files to Modify**:
```
src/App.tsx
src/views/Upload.tsx
src/views/Report.tsx
src/views/Home.tsx
src/views/ContractDetail.tsx
```

---

## Phase 2: DID & Blockchain Integration

### Sprint 2.1: DID BaaS SDK Integration (4 days)

| ID | Task | Priority | Effort | Status | Dependencies |
|----|------|----------|--------|--------|--------------|
| DID-001 | Obtain DID BaaS API key | P0 | XS | [x] | - |
| DID-002 | Create DidBaasClient Python class | P0 | M | [x] | BE-001 |
| DID-003 | Implement issue_did() method | P0 | M | [x] | DID-002 |
| DID-004 | Implement verify_did() method | P0 | S | [x] | DID-002 |
| DID-005 | Implement get_did_document() method | P1 | S | [x] | DID-002 |
| DID-006 | Implement issue_w3c_credential() method | P0 | M | [x] | DID-002 |
| DID-007 | Implement verify_credential() method | P0 | S | [x] | DID-002 |
| DID-008 | Add error handling for DID BaaS calls | P0 | S | [x] | DID-002..007 |
| DID-009 | Write integration tests | P1 | M | [x] | DID-003..007 |
| DID-010 | Add mock mode for development | P0 | M | [x] | DID-002 |

**Files to Create**:
```
backend/app/services/did_baas.py
backend/tests/test_did_baas.py
```

---

### Sprint 2.2: DID Issuance for Users (4 days)

| ID | Task | Priority | Effort | Status | Dependencies |
|----|------|----------|--------|--------|--------------|
| DID-011 | Add did_address field to User model | P0 | S | [x] | AUTH-001 |
| DID-012 | Add did_status enum (NONE, PENDING, CONFIRMED) | P0 | S | [x] | AUTH-001 |
| DID-013 | Create Alembic migration for DID fields | P0 | S | [x] | DID-011, DID-012 |
| DID-014 | Create POST /did/issue endpoint | P0 | M | [x] | DID-003 |
| DID-015 | Create GET /did/status endpoint | P0 | S | [x] | DID-004 |
| DID-016 | Implement DID status polling logic | P1 | M | [x] | DID-015 |
| DID-017 | Update auth_level after DID confirmation | P0 | S | [x] | DID-016 |
| DID-017 | Add DID creation UI to Profile.tsx | P0 | M | [ ] | DID-013 |
| DID-018 | Show DID status badge in profile | P1 | S | [ ] | DID-017 |

**Files to Modify**:
```
backend/app/models/user.py
backend/app/api/v1/users.py
src/views/Profile.tsx
```

---

### Sprint 2.3: Electronic Signature with VC (5 days)

| ID | Task | Priority | Effort | Status | Dependencies |
|----|------|----------|--------|--------|--------------|
| SIGN-001 | Create ContractSignature model | P0 | M | [x] | CTR-001 |
| SIGN-002 | Create ContractSignature schema | P0 | S | [x] | SIGN-001 |
| SIGN-003 | Create SafeCon issuer DID (one-time) | P0 | M | [x] | DID-003 |
| SIGN-004 | Register contract-signature-v1 schema | P0 | M | [x] | DID-002 |
| SIGN-005 | Create document hash before signing | P0 | S | [x] | DOC-006 |
| SIGN-006 | Issue W3C VC for signature | P0 | L | [x] | DID-006, SIGN-005 |
| SIGN-007 | Store credential ID in database | P0 | S | [x] | SIGN-006 |
| SIGN-008 | Create POST /signatures/sign endpoint | P0 | M | [x] | SIGN-006 |
| SIGN-009 | Create GET /signatures/contract/{id} endpoint | P0 | S | [x] | SIGN-001 |
| SIGN-010 | Create POST /signatures/verify endpoint | P0 | M | [x] | DID-007 |
| SIGN-011 | Create POST /signatures/{id}/revoke endpoint | P0 | M | [x] | SIGN-001 |
| SIGN-012 | Update DocuSignSigning.tsx for real signing | P0 | L | [ ] | SIGN-008 |
| SIGN-013 | Add signature verification UI | P1 | M | [ ] | SIGN-010 |

**Files to Create**:
```
backend/app/models/signature.py
backend/app/schemas/signature.py
backend/app/api/v1/signatures.py
```

---

### Sprint 2.4: Blockchain Record Storage (4 days)

| ID | Task | Priority | Effort | Status | Dependencies |
|----|------|----------|--------|--------|--------------|
| CHAIN-001 | Create BlockchainRecord model | P0 | M | [x] | CTR-001 |
| CHAIN-002 | Create BlockchainRecord schema | P0 | S | [x] | CHAIN-001 |
| CHAIN-003 | Extract tx_hash from VC response | P0 | S | [x] | SIGN-006 |
| CHAIN-004 | Store blockchain details in DB | P0 | S | [x] | CHAIN-003 |
| CHAIN-005 | Create POST /contracts/{id}/notarize endpoint | P0 | M | [x] | CHAIN-004 |
| CHAIN-006 | Create GET /contracts/{id}/blockchain endpoint | P0 | S | [x] | CHAIN-001 |
| CHAIN-007 | Create GET /verify/{hash} public endpoint | P0 | M | [x] | CHAIN-001 |
| CHAIN-008 | Display blockchain info in ContractDetail | P0 | M | [ ] | CHAIN-006 |
| CHAIN-009 | Create public Verify.tsx page | P1 | M | [ ] | CHAIN-007 |

**Files to Create**:
```
backend/app/models/blockchain.py
backend/app/schemas/blockchain.py
backend/app/api/v1/blockchain.py
src/views/Verify.tsx
```

---

### Sprint 2.5: Certificate Generation (4 days)

| ID | Task | Priority | Effort | Status | Dependencies |
|----|------|----------|--------|--------|--------------|
| CERT-001 | Design certificate PDF template (HTML) | P0 | M | [ ] | - |
| CERT-002 | Create certificate number generator | P0 | S | [ ] | - |
| CERT-003 | Create QR code generation utility | P0 | S | [ ] | - |
| CERT-004 | Create Certificate model | P0 | S | [ ] | CHAIN-001 |
| CERT-005 | Create PDF generation service | P0 | L | [ ] | CERT-001 |
| CERT-006 | Create GET /contracts/{id}/certificate endpoint | P0 | M | [ ] | CERT-005 |
| CERT-007 | Store certificate PDF in S3 | P0 | S | [ ] | DOC-001 |
| CERT-008 | Add certificate download button in UI | P0 | S | [ ] | CERT-006 |

**Files to Create**:
```
backend/app/services/certificate.py
backend/app/utils/qrcode.py
backend/templates/certificate.html
```

---

## Phase 3: Advanced Features

### Sprint 3.1: Merkle Tree Batching (5 days)

| ID | Task | Priority | Effort | Status | Dependencies |
|----|------|----------|--------|--------|--------------|
| MERK-001 | Create Merkle tree library/utility | P0 | M | [ ] | - |
| MERK-002 | Create PendingAnchor model | P0 | S | [ ] | - |
| MERK-003 | Create AnchorBatch model | P0 | S | [ ] | - |
| MERK-004 | Queue documents for batching | P0 | M | [ ] | MERK-002 |
| MERK-005 | Create batch processing job | P0 | L | [ ] | MERK-001 |
| MERK-006 | Build Merkle tree from batch | P0 | M | [ ] | MERK-005 |
| MERK-007 | Anchor root hash to Xphere | P0 | M | [ ] | DID-002 |
| MERK-008 | Store Merkle proofs per document | P0 | M | [ ] | MERK-006 |
| MERK-009 | Update verification with Merkle proof | P0 | M | [ ] | CHAIN-007 |
| MERK-010 | Schedule batch job (APScheduler/Celery) | P1 | M | [ ] | MERK-005 |

---

### Sprint 3.2: Multi-party Signing (5 days)

| ID | Task | Priority | Effort | Status | Dependencies |
|----|------|----------|--------|--------|--------------|
| MULTI-001 | Enhance ContractParty model | P0 | M | [ ] | CTR-005 |
| MULTI-002 | Add signing_order field | P0 | S | [ ] | MULTI-001 |
| MULTI-003 | Add signature_status per party | P0 | S | [ ] | MULTI-001 |
| MULTI-004 | Create email invitation service | P0 | L | [ ] | - |
| MULTI-005 | Send signing invitation email | P0 | M | [ ] | MULTI-004 |
| MULTI-006 | Create party signing token | P0 | M | [ ] | - |
| MULTI-007 | Enforce signing order | P0 | M | [ ] | MULTI-002 |
| MULTI-008 | Lock document after all signatures | P0 | S | [ ] | SIGN-008 |
| MULTI-009 | Send completion notification | P1 | M | [ ] | MULTI-004 |
| MULTI-010 | Add party management UI | P1 | L | [ ] | MULTI-001..009 |

---

### Sprint 3.3: Contract Version Control (4 days)

| ID | Task | Priority | Effort | Status | Dependencies |
|----|------|----------|--------|--------|--------------|
| VER-001 | Add version field to ContractDocument | P0 | S | [ ] | CTR-004 |
| VER-002 | Auto-increment version on upload | P0 | S | [ ] | VER-001 |
| VER-003 | Store all document versions | P0 | M | [ ] | VER-002 |
| VER-004 | Create GET /documents/{id}/versions endpoint | P0 | M | [ ] | VER-003 |
| VER-005 | Create diff comparison utility | P2 | L | [ ] | - |
| VER-006 | Add version history UI | P1 | M | [ ] | VER-004 |

---

### Sprint 3.4: Sharing & Collaboration (4 days)

| ID | Task | Priority | Effort | Status | Dependencies |
|----|------|----------|--------|--------|--------------|
| SHARE-001 | Create ShareLink model | P0 | S | [ ] | CTR-001 |
| SHARE-002 | Generate shareable link tokens | P0 | M | [ ] | SHARE-001 |
| SHARE-003 | Add password protection option | P1 | M | [ ] | SHARE-002 |
| SHARE-004 | Add expiration date option | P1 | S | [ ] | SHARE-001 |
| SHARE-005 | Create GET /share/{token} endpoint | P0 | M | [ ] | SHARE-002 |
| SHARE-006 | Track link access logs | P2 | M | [ ] | SHARE-005 |
| SHARE-007 | Add sharing UI to ContractDetail | P0 | M | [ ] | SHARE-002 |

---

## Phase 4: Monetization

### Sprint 4.1: Subscription System (5 days)

| ID | Task | Priority | Effort | Status | Dependencies |
|----|------|----------|--------|--------|--------------|
| PAY-001 | Integrate payment provider (Toss/Stripe) | P0 | XL | [ ] | - |
| PAY-002 | Create Subscription model | P0 | M | [ ] | AUTH-001 |
| PAY-003 | Create subscription tier logic | P0 | M | [ ] | PAY-002 |
| PAY-004 | Implement usage tracking | P0 | M | [ ] | PAY-003 |
| PAY-005 | Create subscription endpoints | P0 | L | [ ] | PAY-001..004 |
| PAY-006 | Create upgrade/downgrade flow | P0 | L | [ ] | PAY-005 |
| PAY-007 | Add billing dashboard | P1 | L | [ ] | PAY-005 |

---

### Sprint 4.2: B2B API (5 days)

| ID | Task | Priority | Effort | Status | Dependencies |
|----|------|----------|--------|--------|--------------|
| B2B-001 | Create ApiKey model | P0 | S | [ ] | AUTH-001 |
| B2B-002 | Create API key management endpoints | P0 | M | [ ] | B2B-001 |
| B2B-003 | Implement per-key rate limiting | P0 | M | [ ] | B2B-001 |
| B2B-004 | Create usage tracking per key | P0 | M | [ ] | B2B-001 |
| B2B-005 | Generate OpenAPI documentation | P0 | M | [ ] | All API endpoints |
| B2B-006 | Create developer portal UI | P2 | L | [ ] | B2B-002 |
| B2B-007 | Add webhook notifications | P2 | L | [ ] | - |

---

## Task Summary

### Progress (Updated: 2024-12-23)

| Phase | Total | Done | In Progress | Remaining |
|-------|-------|------|-------------|-----------|
| Phase 1 | 57 | 40 | 0 | 17 |
| Phase 2 | 44 | 27 | 0 | 17 |
| Phase 3 | 33 | 0 | 0 | 33 |
| Phase 4 | 14 | 0 | 0 | 14 |
| **Total** | **148** | **67** | **0** | **81** |

**Completion: 45%**

### Recent Updates (2024-12-23)
- BE-007: Configured structlog for structured logging (JSON in production, colored console in development)
- BE-010: Added standardized error handling with error codes (AUTH_1xxx, USER_2xxx, etc.)
- AUTH-014: Completed unit tests for authentication endpoints
- CTR-015: Completed unit tests for contract CRUD operations
- DID-001: Obtained DID BaaS API key (sk_live_...)
- DID-009: Completed integration tests for DID BaaS client
- SIGN-003: Created SafeCon issuer DID using real DID BaaS API

### By Phase

| Phase | Total Tasks | P0 | P1 | P2 | P3 |
|-------|-------------|----|----|----|----|
| Phase 1 | 57 | 35 | 19 | 3 | 0 |
| Phase 2 | 44 | 33 | 8 | 3 | 0 |
| Phase 3 | 33 | 19 | 9 | 5 | 0 |
| Phase 4 | 14 | 10 | 2 | 2 | 0 |
| **Total** | **148** | **97** | **38** | **13** | **0** |

### Recommended Execution Order

1. **Week 1-2**: BE-001..009, AUTH-001..014
2. **Week 3**: CTR-001..015
3. **Week 4**: DOC-001..014
4. **Week 5**: AI-001..012
5. **Week 6**: FE-001..014
6. **Week 7-8**: DID-001..018
7. **Week 9-10**: SIGN-001..012, CHAIN-001..009
8. **Week 11**: CERT-001..008
9. **Week 12+**: Phase 3 & 4

---

## Dependencies Graph

```
BE-001 ─┬─► BE-002 ─► AUTH-* ─► FE-004..007
        ├─► BE-003 ─► CTR-* ─► DOC-* ─► AI-*
        └─► BE-006 ─► BE-005 ─► AUTH-012

DID-002 ─┬─► DID-003..009 ─► DID-010..018
         └─► SIGN-006 ─► CHAIN-003..009 ─► CERT-*

SIGN-001..012 ─► MULTI-*
CTR-004 ─► VER-*
CTR-001 ─► SHARE-*
```
