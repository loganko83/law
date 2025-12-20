# Tasks: Backend Implementation

**Spec**: `specs/002-gap-analysis/gap-analysis.md`
**Priority**: CRITICAL

## Sprint Overview

| Sprint | Focus | Status |
|--------|-------|--------|
| Sprint 1 | Backend Setup + Auth | IN PROGRESS |
| Sprint 2 | Database + APIs | TODO |
| Sprint 3 | AI Integration | TODO |

## Sprint 1: Backend Foundation

### TASK-001: Create Backend Directory Structure
**Priority**: P0 | **Effort**: S | **Status**: TODO

**Description**: Set up FastAPI project structure with proper organization

**Acceptance Criteria**:
- [ ] backend/ directory created
- [ ] FastAPI app initialized
- [ ] requirements.txt with dependencies
- [ ] Docker Compose for PostgreSQL + Redis

**Files to Create**:
- `backend/app/main.py`
- `backend/app/core/config.py`
- `backend/app/core/security.py`
- `backend/requirements.txt`
- `docker-compose.yml`

---

### TASK-002: Implement Database Models
**Priority**: P0 | **Effort**: M | **Status**: TODO

**Description**: Create SQLAlchemy models matching ERD specification

**Acceptance Criteria**:
- [ ] User model with auth fields
- [ ] Contract model with relationships
- [ ] ContractDocument model
- [ ] AIAnalysis model
- [ ] Database migrations with Alembic

**Files to Create**:
- `backend/app/models/user.py`
- `backend/app/models/contract.py`
- `backend/app/models/analysis.py`
- `backend/app/db/base.py`

---

### TASK-003: Implement JWT Authentication
**Priority**: P0 | **Effort**: M | **Status**: TODO

**Description**: Implement JWT-based authentication with RS256

**Acceptance Criteria**:
- [ ] User registration endpoint
- [ ] User login endpoint
- [ ] Access token generation (30min)
- [ ] Refresh token rotation
- [ ] Password hashing with bcrypt

**Files to Create**:
- `backend/app/api/auth.py`
- `backend/app/core/jwt.py`
- `backend/app/schemas/auth.py`

---

### TASK-004: Create Contract APIs
**Priority**: P0 | **Effort**: M | **Status**: TODO

**Description**: Implement contract CRUD operations

**Acceptance Criteria**:
- [ ] POST /contracts - Create contract
- [ ] GET /contracts - List user contracts
- [ ] GET /contracts/{id} - Get contract detail
- [ ] PUT /contracts/{id} - Update contract
- [ ] DELETE /contracts/{id} - Delete contract

**Files to Create**:
- `backend/app/api/contracts.py`
- `backend/app/schemas/contract.py`
- `backend/app/crud/contract.py`

---

### TASK-005: Implement Document Upload
**Priority**: P0 | **Effort**: M | **Status**: TODO

**Description**: File upload with local storage (MVP) or S3

**Acceptance Criteria**:
- [ ] POST /contracts/{id}/documents - Upload file
- [ ] File validation (PDF, DOCX, images)
- [ ] Size limit (50MB)
- [ ] SHA-256 hash generation
- [ ] Storage abstraction layer

**Files to Create**:
- `backend/app/api/documents.py`
- `backend/app/services/storage.py`

---

## Sprint 2: AI Integration

### TASK-006: Move AI Analysis to Backend
**Priority**: P1 | **Effort**: L | **Status**: TODO

**Description**: Move Gemini AI integration from frontend to backend

**Acceptance Criteria**:
- [ ] POST /ai/analyze - Start analysis
- [ ] GET /ai/analysis/{id} - Get results
- [ ] Store analysis in database
- [ ] WebSocket for progress updates (optional)

**Files to Create**:
- `backend/app/api/analysis.py`
- `backend/app/services/ai_analyzer.py`
- `backend/app/schemas/analysis.py`

---

### TASK-007: Implement Text Extraction
**Priority**: P1 | **Effort**: M | **Status**: TODO

**Description**: Extract text from uploaded documents

**Acceptance Criteria**:
- [ ] PDF text extraction
- [ ] DOCX text extraction
- [ ] Image OCR (Tesseract)
- [ ] Text preprocessing

**Files to Create**:
- `backend/app/services/text_extractor.py`
- `backend/app/services/ocr.py`

---

## Priority Matrix

| Task | Priority | Effort | Dependencies | Status |
|------|----------|--------|--------------|--------|
| TASK-001 | P0 | S | None | TODO |
| TASK-002 | P0 | M | TASK-001 | TODO |
| TASK-003 | P0 | M | TASK-002 | TODO |
| TASK-004 | P0 | M | TASK-003 | TODO |
| TASK-005 | P0 | M | TASK-004 | TODO |
| TASK-006 | P1 | L | TASK-005 | TODO |
| TASK-007 | P1 | M | TASK-005 | TODO |

**Legend**:
- Priority: P0=Critical, P1=Important, P2=Nice-to-have
- Effort: S=Small(<2hr), M=Medium(2-8hr), L=Large(1-2 days)

## Done Criteria

- [ ] All P0 tasks completed
- [ ] User can register and login
- [ ] User can upload contract and get AI analysis
- [ ] Data persists in PostgreSQL
- [ ] API documented with OpenAPI/Swagger
