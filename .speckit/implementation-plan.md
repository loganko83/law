# SafeCon Implementation Plan v2.0

## Overview

This document outlines the phased implementation plan for SafeCon, integrating:
- **Gemini AI** for contract analysis
- **DID BaaS** for decentralized identity and credentials
- **Xphere Blockchain** for notarization (via DID BaaS)

---

## Phase Summary

| Phase | Focus | Key Deliverables |
|-------|-------|------------------|
| **Phase 1** | Backend Foundation | FastAPI, PostgreSQL, Auth, File Upload |
| **Phase 2** | DID & Blockchain | DID BaaS integration, E-Signature, Notarization |
| **Phase 3** | Advanced Features | Merkle batching, Certificates, Multi-party signing |
| **Phase 4** | Monetization | Subscriptions, B2B API, Analytics |

---

## Tech Stack Confirmation

### Frontend (Current)
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.x | UI framework |
| TypeScript | 5.x | Type safety |
| Vite | 6.x | Build tool |
| TailwindCSS | 3.x | Styling |
| Framer Motion | 12.x | Animations |
| react-i18next | 15.x | i18n |
| jspdf + html2canvas | - | PDF export |

### Backend (New)
| Technology | Version | Purpose |
|------------|---------|---------|
| FastAPI | 0.110+ | API server |
| Python | 3.12 | Runtime |
| SQLAlchemy | 2.0 | ORM |
| PostgreSQL | 16 | Database |
| Redis | 7.2 | Caching |
| python-jose | - | JWT |
| httpx | - | Async HTTP client |

### External Services
| Service | Purpose |
|---------|---------|
| Gemini API | AI contract analysis |
| DID BaaS | DID, Credentials, Blockchain |
| Xphere | Blockchain network (via DID BaaS) |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                   Frontend (React/Vite)                      │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───────────────┐     │
│  │  Home   │ │ Upload  │ │ Report  │ │  Legal Tools  │     │
│  └────┬────┘ └────┬────┘ └────┬────┘ └───────┬───────┘     │
│       └───────────┴───────────┴───────────────┘             │
│                           │                                  │
│              API Client (axios/fetch)                        │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP/REST
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Backend (FastAPI)                          │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───────────────┐     │
│  │  Auth   │ │Contract │ │   AI    │ │   DID/Sign    │     │
│  │ Service │ │ Service │ │ Service │ │   Service     │     │
│  └────┬────┘ └────┬────┘ └────┬────┘ └───────┬───────┘     │
│       └───────────┴───────────┴───────────────┘             │
│                           │                                  │
│              ┌────────────┼────────────┐                    │
│              ▼            ▼            ▼                    │
│         PostgreSQL      Redis       S3/MinIO                │
└─────────────────────────────────────────────────────────────┘
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
┌───────────────────┐ ┌───────────┐ ┌───────────────────────┐
│    Gemini API     │ │  DID BaaS │ │   Xphere Blockchain   │
│  gemini-3-flash   │ │  /api/v1/ │ │  (via DID BaaS)       │
└───────────────────┘ └───────────┘ └───────────────────────┘
```

---

## Phase 1: Backend Foundation

### Objective
Build the core backend infrastructure to support data persistence, authentication, and file handling.

### Directory Structure
```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI app entry
│   ├── config.py               # Environment config
│   ├── database.py             # SQLAlchemy setup
│   ├── api/
│   │   ├── __init__.py
│   │   ├── deps.py             # Dependencies (auth, db)
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── auth.py         # Auth endpoints
│   │       ├── users.py        # User endpoints
│   │       ├── contracts.py    # Contract endpoints
│   │       ├── analysis.py     # AI analysis endpoints
│   │       └── documents.py    # File upload endpoints
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── contract.py
│   │   ├── document.py
│   │   └── analysis.py
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── contract.py
│   │   └── analysis.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── auth.py             # JWT handling
│   │   ├── gemini.py           # AI client
│   │   ├── did_baas.py         # DID BaaS client
│   │   ├── ocr.py              # OCR service
│   │   └── storage.py          # File storage
│   └── utils/
│       ├── __init__.py
│       ├── security.py         # Password hashing
│       └── hash.py             # SHA-256 utils
├── tests/
├── alembic/                    # DB migrations
├── requirements.txt
├── Dockerfile
└── docker-compose.yml
```

### Sprint 1.1: Project Setup (3 days)
```yaml
Tasks:
  - [ ] Initialize FastAPI project structure
  - [ ] Configure SQLAlchemy with PostgreSQL
  - [ ] Set up Alembic migrations
  - [ ] Configure Redis connection
  - [ ] Set up Docker Compose for local dev
  - [ ] Configure environment variables
  - [ ] Set up logging and error handling

Files to Create:
  - backend/app/main.py
  - backend/app/config.py
  - backend/app/database.py
  - backend/requirements.txt
  - backend/Dockerfile
  - backend/docker-compose.yml
  - backend/alembic.ini

Deliverables:
  - FastAPI app running locally on port 8000
  - Database connection working
  - Docker Compose with postgres + redis
```

### Sprint 1.2: User Authentication (5 days)
```yaml
Tasks:
  - [ ] Create User model with SQLAlchemy
  - [ ] Create Pydantic schemas for User
  - [ ] Implement password hashing (bcrypt)
  - [ ] Create JWT token generation (RS256)
  - [ ] Implement refresh token rotation
  - [ ] Create auth endpoints:
        POST /api/v1/auth/register
        POST /api/v1/auth/login
        POST /api/v1/auth/refresh
        POST /api/v1/auth/logout
  - [ ] Add rate limiting with Redis (bucket4j pattern)
  - [ ] Write unit tests for auth

Files to Create:
  - backend/app/models/user.py
  - backend/app/schemas/user.py
  - backend/app/services/auth.py
  - backend/app/api/v1/auth.py
  - backend/app/utils/security.py

Deliverables:
  - Working authentication system
  - JWT tokens with 30min expiry
  - Refresh token rotation
  - Rate limiting on login (5 attempts/min)
```

### Sprint 1.3: Contract CRUD (5 days)
```yaml
Tasks:
  - [ ] Create Contract model with all fields
  - [ ] Create ContractDocument model
  - [ ] Create ContractParty model
  - [ ] Create Pydantic schemas
  - [ ] Implement contract endpoints:
        POST   /api/v1/contracts
        GET    /api/v1/contracts
        GET    /api/v1/contracts/{id}
        PATCH  /api/v1/contracts/{id}
        DELETE /api/v1/contracts/{id}
  - [ ] Add pagination (limit/offset)
  - [ ] Add filtering (status, type, date range)
  - [ ] Implement soft delete (archive)
  - [ ] Write unit tests

Files to Create:
  - backend/app/models/contract.py
  - backend/app/models/document.py
  - backend/app/schemas/contract.py
  - backend/app/api/v1/contracts.py

Deliverables:
  - Full contract CRUD API
  - Pagination with 20 items/page default
  - Filtering by status, type, date
```

### Sprint 1.4: File Upload & OCR (5 days)
```yaml
Tasks:
  - [ ] Configure S3/MinIO storage client
  - [ ] Create file upload endpoint:
        POST /api/v1/documents/upload
  - [ ] Implement file validation:
        - PDF, DOCX, JPG, PNG only
        - Max 50MB
  - [ ] Integrate OCR service:
        Option A: Google Cloud Vision API
        Option B: Tesseract (self-hosted)
  - [ ] Extract text and store in database
  - [ ] Generate content hash (SHA-256)
  - [ ] Write unit tests

Files to Create:
  - backend/app/services/storage.py
  - backend/app/services/ocr.py
  - backend/app/api/v1/documents.py
  - backend/app/utils/hash.py

Deliverables:
  - File upload to S3/MinIO
  - OCR extracting Korean text (95%+ accuracy)
  - SHA-256 hash for each document
```

### Sprint 1.5: AI Analysis Integration (5 days)
```yaml
Tasks:
  - [ ] Create Gemini client service (migrate from frontend)
  - [ ] Create analysis service with pattern detection
  - [ ] Create ContractAnalysis model
  - [ ] Implement analysis endpoints:
        POST /api/v1/analysis
        GET  /api/v1/analysis/{id}
  - [ ] Integrate existing 7 risk patterns
  - [ ] Store analysis results in database
  - [ ] Add async processing option (background task)
  - [ ] Write unit tests

Files to Create:
  - backend/app/services/gemini.py
  - backend/app/models/analysis.py
  - backend/app/schemas/analysis.py
  - backend/app/api/v1/analysis.py

Deliverables:
  - AI analysis via API
  - Results persisted to database
  - Pattern detection working
  - Analysis < 30 seconds for 10 pages
```

### Sprint 1.6: Frontend Integration (4 days)
```yaml
Tasks:
  - [ ] Create API client service in frontend
  - [ ] Create AuthContext for authentication state
  - [ ] Add login/register pages
  - [ ] Connect Upload view to backend API
  - [ ] Connect Report view to fetch from API
  - [ ] Update ContractDetail to use real data
  - [ ] Update Home to fetch contracts from API
  - [ ] Add loading states and error handling
  - [ ] Test end-to-end flow

Files to Create:
  - src/services/api.ts
  - src/contexts/AuthContext.tsx
  - src/views/Login.tsx
  - src/views/Register.tsx

Files to Modify:
  - src/App.tsx (add auth routes)
  - src/views/Upload.tsx
  - src/views/Report.tsx
  - src/views/Home.tsx
  - src/views/ContractDetail.tsx

Deliverables:
  - Frontend connected to backend
  - Real data flowing through app
  - Auth working in frontend
```

---

## Phase 2: DID & Blockchain Integration

### Objective
Integrate DID BaaS for decentralized identity and electronic signatures with blockchain anchoring on Xphere.

### DID BaaS Service Details
```yaml
Base URL: https://trendy.storydot.kr/did-baas/api/v1/
Swagger: https://trendy.storydot.kr/did-baas/api/swagger-ui.html
Network: Xphere (chainId: 20250217)

Key Endpoints:
  - POST /did              - Issue DID
  - GET  /did/{id}/verify  - Verify DID
  - POST /credentials/w3c  - Issue W3C VC
  - POST /credentials/w3c/verify - Verify VC
  - POST /bbs/sign         - BBS+ signing
  - POST /bbs/derive-proof - Selective disclosure
```

### Sprint 2.1: DID BaaS SDK Integration (4 days)
```yaml
Tasks:
  - [ ] Obtain API key for DID BaaS
  - [ ] Create Python client for DID BaaS in backend
  - [ ] Implement DID operations:
        - issue_did(metadata)
        - verify_did(did_address)
        - get_did_document(did_address)
  - [ ] Implement Credential operations:
        - issue_credential(issuer, subject, claims)
        - verify_credential(credential)
  - [ ] Test all operations

Files to Create:
  - backend/app/services/did_baas.py

Code Example:
```python
# backend/app/services/did_baas.py
import httpx
from app.config import settings

class DidBaasClient:
    def __init__(self):
        self.base_url = settings.DID_BAAS_URL
        self.api_key = settings.DID_BAAS_API_KEY

    async def issue_did(self, metadata: dict) -> dict:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/did",
                json={"metadata": metadata},
                headers={"Authorization": f"Bearer {self.api_key}"}
            )
            response.raise_for_status()
            return response.json()

    async def issue_w3c_credential(
        self,
        issuer_did: str,
        subject_did: str,
        schema_id: str,
        claims: dict
    ) -> dict:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/credentials/w3c",
                json={
                    "issuerDid": issuer_did,
                    "subjectDid": subject_did,
                    "schemaId": schema_id,
                    "claims": claims
                },
                headers={"Authorization": f"Bearer {self.api_key}"}
            )
            response.raise_for_status()
            return response.json()
```

Deliverables:
  - DID BaaS client working
  - Can issue and verify DIDs
  - Can issue and verify credentials
```

### Sprint 2.2: DID Issuance for Users (4 days)
```yaml
Tasks:
  - [ ] Add did_address field to User model
  - [ ] Add did_status field (NONE, PENDING, CONFIRMED)
  - [ ] Create DID issuance endpoint:
        POST /api/v1/users/{id}/did
  - [ ] Implement DID status polling
        GET /api/v1/users/{id}/did/status
  - [ ] Update user auth_level to 'did' after confirmation
  - [ ] Create UI for DID creation in Profile view
  - [ ] Show DID status and address in profile

Files to Modify:
  - backend/app/models/user.py (add did fields)
  - backend/app/api/v1/users.py (add DID endpoints)
  - src/views/Profile.tsx (add DID UI)

Deliverables:
  - Users can create DIDs
  - DIDs anchored on Xphere
  - Auth level upgraded after DID creation
```

### Sprint 2.3: Electronic Signature with VC (5 days)
```yaml
Tasks:
  - [ ] Create ContractSignature model
  - [ ] Create SafeCon issuer DID (one-time setup)
  - [ ] Implement document hash generation before signing
  - [ ] Create contract-signature-v1 schema in DID BaaS
  - [ ] Issue W3C Verifiable Credential for each signature:
        Claims:
          - contractId
          - contractHash
          - signedAt
          - signerDid
  - [ ] Store credential ID in database
  - [ ] Implement signature endpoints:
        POST /api/v1/contracts/{id}/sign
        GET  /api/v1/contracts/{id}/signatures
        GET  /api/v1/signatures/{id}/verify
  - [ ] Update DocuSignSigning.tsx to use real signing flow

Files to Create:
  - backend/app/models/signature.py
  - backend/app/schemas/signature.py
  - backend/app/api/v1/signatures.py

Files to Modify:
  - src/views/DocuSignSigning.tsx

Deliverables:
  - Real electronic signatures
  - W3C VCs issued for each signature
  - Signatures verifiable via DID BaaS
  - Credential anchored on Xphere
```

### Sprint 2.4: Blockchain Record Storage (4 days)
```yaml
Tasks:
  - [ ] Create BlockchainRecord model
  - [ ] Store transaction details from VC issuance:
        - tx_hash
        - block_number
        - network (xphere)
        - anchored_at
  - [ ] Create notarization endpoints:
        POST /api/v1/contracts/{id}/notarize
        GET  /api/v1/contracts/{id}/blockchain-record
        GET  /api/v1/verify/{document_hash}
  - [ ] Display blockchain info in ContractDetail
  - [ ] Add verification page for external users

Files to Create:
  - backend/app/models/blockchain.py
  - backend/app/schemas/blockchain.py
  - backend/app/api/v1/blockchain.py
  - src/views/Verify.tsx

Deliverables:
  - Blockchain records stored in DB
  - TX hash visible to users
  - Public verification page working
```

### Sprint 2.5: Certificate Generation (4 days)
```yaml
Tasks:
  - [ ] Design certificate PDF template
  - [ ] Generate unique certificate numbers (SC-YYYY-NNNNNN)
  - [ ] Create QR code generation utility
  - [ ] Create certificate endpoint:
        GET /api/v1/contracts/{id}/certificate
  - [ ] Store certificate PDF in S3
  - [ ] Add download button in UI

Files to Create:
  - backend/app/services/certificate.py
  - backend/app/utils/qrcode.py
  - backend/templates/certificate.html

Deliverables:
  - PDF certificates generated
  - QR codes linking to verification URL
  - Download working in UI
```

---

## Phase 3: Advanced Features

### Sprint 3.1: Merkle Tree Batching (5 days)
```yaml
Tasks:
  - [ ] Implement Merkle tree library (merkle-tree-js or custom)
  - [ ] Create pending_anchors queue table
  - [ ] Create batch processing job (Celery or APScheduler)
        - Run every 10 minutes
        - Collect pending hashes
        - Build Merkle tree (max 1000 leaves)
        - Anchor root via DID BaaS or direct Xphere
  - [ ] Store Merkle proofs per document
  - [ ] Update verification to use Merkle proofs

Files to Create:
  - backend/app/services/merkle.py
  - backend/app/models/anchor_batch.py
  - backend/app/tasks/batch_anchor.py

Deliverables:
  - Merkle batching active
  - Cost reduction: ~98% (from individual to batch)
```

### Sprint 3.2: Multi-party Signing (5 days)
```yaml
Tasks:
  - [ ] Enhance ContractParty model
  - [ ] Implement signing order logic
  - [ ] Create email invitation service
  - [ ] Track per-party signature status
  - [ ] Lock document after all signatures
  - [ ] Send completion notification

Files to Create:
  - backend/app/services/email.py
  - backend/app/api/v1/parties.py

Deliverables:
  - Multi-party signing (2-10 parties)
  - Email invitations sent
  - Sequential/parallel signing modes
```

### Sprint 3.3: Contract Version Control (4 days)
```yaml
Tasks:
  - [ ] Add version field to ContractDocument
  - [ ] Store all document versions
  - [ ] Implement version history API
  - [ ] Create diff comparison utility
  - [ ] Add version history UI

Deliverables:
  - Version history visible
  - Document comparison working
```

### Sprint 3.4: Sharing & Collaboration (4 days)
```yaml
Tasks:
  - [ ] Create ShareLink model
  - [ ] Generate shareable links with tokens
  - [ ] Add password protection option
  - [ ] Set expiration dates
  - [ ] Track link access logs

Deliverables:
  - Shareable links working
  - Password protection available
  - Access tracking active
```

---

## Phase 4: Monetization

### Sprint 4.1: Subscription System (5 days)
```yaml
Tasks:
  - [ ] Integrate payment provider (Toss Payments or Stripe)
  - [ ] Create subscription tiers:
        - Free: 3 analyses/month, no signing
        - Basic (9,900/month): Unlimited analysis, 5 signatures
        - Pro (19,900/month): + 10 blockchain certificates
  - [ ] Implement usage tracking
  - [ ] Create upgrade/downgrade flow
  - [ ] Add billing dashboard

Deliverables:
  - Payment integration working
  - Subscription tiers enforced
```

### Sprint 4.2: B2B API (5 days)
```yaml
Tasks:
  - [ ] Create API key management
  - [ ] Document API with OpenAPI/Swagger
  - [ ] Implement per-key rate limiting
  - [ ] Create usage dashboard
  - [ ] Add webhook notifications

Deliverables:
  - B2B API available
  - API documentation complete
  - Usage analytics available
```

---

## Deployment Configuration

### Environment Variables
```bash
# Backend (.env)
APP_ENV=production
DATABASE_URL=postgresql://safecon:password@postgres:5432/safecon
REDIS_URL=redis://redis:6379/0

# JWT
JWT_PRIVATE_KEY_PATH=/secrets/jwt_private.pem
JWT_PUBLIC_KEY_PATH=/secrets/jwt_public.pem
JWT_ALGORITHM=RS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# AI
GEMINI_API_KEY=your-gemini-api-key

# DID BaaS
DID_BAAS_URL=https://trendy.storydot.kr/did-baas/api/v1
DID_BAAS_API_KEY=your-did-baas-api-key
SAFECON_ISSUER_DID=did:sw:safecon:issuer

# Storage
S3_ENDPOINT=https://s3.amazonaws.com
S3_BUCKET=safecon-documents
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key

# Frontend (.env)
VITE_API_URL=https://trendy.storydot.kr/law/api/v1
```

### Docker Compose (Production)
```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://safecon:password@postgres:5432/safecon
      - REDIS_URL=redis://redis:6379/0
      - DID_BAAS_URL=https://trendy.storydot.kr/did-baas/api/v1
      - DID_BAAS_API_KEY=${DID_BAAS_API_KEY}
      - GEMINI_API_KEY=${GEMINI_API_KEY}
    depends_on:
      - postgres
      - redis
    restart: always

  frontend:
    build: ./
    ports:
      - "3000:80"
    environment:
      - VITE_API_URL=http://localhost:8000/api/v1
    restart: always

  postgres:
    image: postgres:16
    environment:
      - POSTGRES_USER=safecon
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=safecon
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5434:5432"
    restart: always

  redis:
    image: redis:7.2
    ports:
      - "6381:6379"
    restart: always

volumes:
  postgres_data:
```

### Server Deployment
```bash
# Server paths
/mnt/storage/law/
├── frontend/          # React build (dist/)
├── backend/           # FastAPI app
├── docker-compose.yml
└── .env

# Deploy script
#!/bin/bash
cd /mnt/storage/law

# Pull latest code
git pull origin main

# Build and deploy
docker-compose down
docker-compose up -d --build

# Check logs
docker-compose logs -f backend
```

---

## Success Criteria

### Phase 1 Complete When:
- [ ] Users can register and login via API
- [ ] Contracts can be uploaded and stored in PostgreSQL
- [ ] AI analysis runs via backend API (not browser)
- [ ] Results persist in database
- [ ] Frontend uses real API instead of mock data

### Phase 2 Complete When:
- [ ] Users can create DIDs via DID BaaS
- [ ] Electronic signatures issue W3C Verifiable Credentials
- [ ] Credentials anchored on Xphere blockchain
- [ ] Blockchain records stored and viewable
- [ ] PDF certificates downloadable

### Phase 3 Complete When:
- [ ] Merkle batching reduces blockchain costs
- [ ] Multi-party signing works with email invitations
- [ ] Version control shows document history
- [ ] Sharing links functional with password protection

### Phase 4 Complete When:
- [ ] Subscription payments processing
- [ ] Usage limits enforced by tier
- [ ] B2B API documented and available
- [ ] Analytics dashboard functional
