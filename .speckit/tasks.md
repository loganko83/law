# SafeCon Task Breakdown

## Sprint 1: Gemini RAG Setup (Week 1-2)

### 1.1 Legal Corpus Preparation
- [ ] **TASK-001**: Research and collect Korean standard contracts
  - Fair Trade Commission standard terms
  - Ministry of Employment labor contracts
  - Real estate standard contracts
  - Convert to plain text format

- [ ] **TASK-002**: Prepare legal reference documents
  - Key Civil Code articles (contracts, obligations)
  - Commercial Code relevant sections
  - Electronic Signature Act summary
  - Precedent case summaries

### 1.2 Gemini File Search Integration
- [ ] **TASK-003**: Create File Search service module
  ```typescript
  // services/fileSearch.ts
  - createLegalCorpusStore()
  - uploadLegalDocument(file, metadata)
  - searchRelevantClauses(query)
  ```

- [ ] **TASK-004**: Implement corpus initialization script
  - Upload all legal documents
  - Add metadata (category, source, date)
  - Verify indexing completion

- [ ] **TASK-005**: Create RAG-enhanced analysis function
  ```typescript
  // services/contractAnalysis.ts
  - analyzeContractWithRAG(contractText)
  - Returns: score, risks, suggestions with citations
  ```

### 1.3 Upload Flow Integration
- [ ] **TASK-006**: Update Upload.tsx
  - Replace mock analysis with real Gemini call
  - Add loading states for analysis
  - Handle errors gracefully

- [ ] **TASK-007**: Update Report.tsx
  - Display RAG citations
  - Add "source" links for risk items
  - Show negotiation scripts from RAG

## Sprint 2: OCR Integration (Week 2-3)

### 2.1 Browser-based OCR
- [ ] **TASK-008**: Install and configure Tesseract.js
  ```bash
  npm install tesseract.js
  ```

- [ ] **TASK-009**: Create OCR service module
  ```typescript
  // services/ocr.ts
  - extractTextFromImage(imageFile): Promise<string>
  - extractTextFromPDF(pdfFile): Promise<string>
  - Progress callback support
  ```

- [ ] **TASK-010**: Add Korean language data
  - Download kor.traineddata
  - Configure Tesseract worker

### 2.2 PDF Processing
- [ ] **TASK-011**: Implement PDF text extraction
  - Use pdf.js for native PDF text
  - Fall back to OCR for scanned PDFs
  - Handle multi-page documents

- [ ] **TASK-012**: Update Upload UI
  - Show OCR progress bar
  - Allow text correction after OCR
  - Preview extracted text before analysis

## Sprint 3: Backend Foundation (Week 3-4)

### 3.1 FastAPI Project Setup
- [ ] **TASK-013**: Initialize backend project
  ```
  backend/
  ├── app/
  │   ├── __init__.py
  │   ├── main.py
  │   ├── api/
  │   ├── core/
  │   ├── models/
  │   └── services/
  └── requirements.txt
  ```

- [ ] **TASK-014**: Configure PostgreSQL
  - Create database schema
  - Set up SQLAlchemy models
  - Initialize Alembic migrations

- [ ] **TASK-015**: Implement authentication
  - JWT token generation/validation
  - User registration endpoint
  - Login endpoint
  - Password hashing (bcrypt)

### 3.2 Core API Endpoints
- [ ] **TASK-016**: Contract CRUD API
  ```python
  POST   /api/contracts        # Create
  GET    /api/contracts        # List user's contracts
  GET    /api/contracts/{id}   # Get detail
  PUT    /api/contracts/{id}   # Update
  DELETE /api/contracts/{id}   # Delete
  ```

- [ ] **TASK-017**: Analysis API
  ```python
  POST   /api/contracts/{id}/analyze  # Trigger analysis
  GET    /api/contracts/{id}/analysis # Get analysis result
  ```

- [ ] **TASK-018**: Document upload API
  ```python
  POST   /api/contracts/{id}/documents  # Upload file
  GET    /api/contracts/{id}/documents  # List documents
  ```

## Sprint 4: Frontend-Backend Integration (Week 4-5)

### 4.1 TanStack Query Setup
- [ ] **TASK-019**: Install and configure TanStack Query
  ```bash
  npm install @tanstack/react-query
  ```

- [ ] **TASK-020**: Create API client
  ```typescript
  // services/api.ts
  - Base axios/fetch configuration
  - Auth token interceptor
  - Error handling
  ```

- [ ] **TASK-021**: Create React Query hooks
  ```typescript
  // hooks/useContracts.ts
  - useContracts()
  - useContract(id)
  - useCreateContract()
  - useAnalyzeContract()
  ```

### 4.2 Auth Flow
- [ ] **TASK-022**: Create auth context/store
  - Login/logout functions
  - Token storage (localStorage)
  - Auto-refresh logic

- [ ] **TASK-023**: Create Login/Register views
  - Email/password form
  - Form validation
  - Error display

- [ ] **TASK-024**: Add protected routes
  - Redirect to login if not authenticated
  - Show user info in header

### 4.3 Data Persistence
- [ ] **TASK-025**: Migrate App.tsx state to API
  - Replace useState with useQuery
  - Add mutation for contract updates
  - Optimistic updates

## Sprint 5: Document Management (Week 5-6)

### 5.1 File Storage
- [ ] **TASK-026**: Set up S3/Minio storage
  - Configure bucket
  - Presigned URL generation
  - File type validation

- [ ] **TASK-027**: Implement secure file access
  - Time-limited download URLs
  - File encryption at rest

### 5.2 PDF Generation
- [ ] **TASK-028**: Create PDF report generator
  - Analysis report template
  - Risk summary page
  - Negotiation guide page

- [ ] **TASK-029**: Certificate PDF generator
  - Blockchain proof format
  - QR code embedding
  - Formal layout

## Sprint 6: Deployment (Week 6)

### 6.1 Server Configuration
- [ ] **TASK-030**: Set up Docker environment
  - Dockerfile for frontend
  - Dockerfile for backend
  - docker-compose.yml

- [ ] **TASK-031**: Configure Nginx reverse proxy
  - Frontend static serving
  - Backend API proxy
  - SSL/TLS setup

### 6.2 CI/CD Pipeline
- [ ] **TASK-032**: Create GitHub Actions workflow
  - Build and test on PR
  - Deploy on merge to main
  - Notify on failure

- [ ] **TASK-033**: Server deployment script
  - Pull latest code
  - Rebuild containers
  - Run migrations
  - Health check

## Priority Matrix

| Task | Priority | Effort | Dependencies |
|------|----------|--------|--------------|
| TASK-003 | P0 | M | None |
| TASK-005 | P0 | L | TASK-003 |
| TASK-006 | P0 | S | TASK-005 |
| TASK-009 | P1 | M | None |
| TASK-013 | P1 | L | None |
| TASK-015 | P1 | M | TASK-013 |
| TASK-019 | P1 | S | None |
| TASK-025 | P1 | M | TASK-016, TASK-021 |
| TASK-030 | P2 | M | All above |

**Legend**: P0=Critical, P1=Important, P2=Nice-to-have
**Effort**: S=Small(1-2hr), M=Medium(4-8hr), L=Large(1-2 days)
