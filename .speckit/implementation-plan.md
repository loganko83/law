# SafeCon Implementation Plan

## Tech Stack Confirmation

### Frontend (Current)
- React 19.2.3 + TypeScript
- Vite 6.2.0
- TailwindCSS (inline)
- Framer Motion 12.x
- Lucide React icons
- jspdf + html2canvas for PDF

### Additions
- **@tanstack/react-query** - Server state management
- **@tanstack/react-router** - Type-safe routing (optional)
- **pdf-lib** - PDF manipulation
- **tesseract.js** - Browser-based OCR

### AI/RAG
- **@google/genai** - Gemini API (already installed)
- Gemini File Search API for RAG corpus

### Backend (New)
- FastAPI 0.110+
- SQLAlchemy 2.0
- PostgreSQL 16
- Redis 7 for caching
- python-jose for JWT

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                   Frontend (React/Vite)                  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───────────────┐ │
│  │  Home   │ │ Upload  │ │ Report  │ │  Legal Tools  │ │
│  └────┬────┘ └────┬────┘ └────┬────┘ └───────┬───────┘ │
│       └───────────┴───────────┴───────────────┘         │
│                           │                              │
│              TanStack Query (API Layer)                  │
└───────────────────────────┬─────────────────────────────┘
                            │ HTTP/WebSocket
                            ▼
┌─────────────────────────────────────────────────────────┐
│                   Backend (FastAPI)                      │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───────────────┐ │
│  │  Auth   │ │Contract │ │   AI    │ │   Storage     │ │
│  │ Service │ │ Service │ │ Service │ │   Service     │ │
│  └────┬────┘ └────┬────┘ └────┬────┘ └───────┬───────┘ │
│       └───────────┴───────────┴───────────────┘         │
│                           │                              │
│              ┌────────────┼────────────┐                │
│              ▼            ▼            ▼                │
│         PostgreSQL      Redis       S3/Minio           │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                  External Services                       │
│  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │  Gemini API     │  │  Gemini File Search (RAG)   │  │
│  │  gemini-3-flash │  │  Legal corpus search        │  │
│  └─────────────────┘  └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Phase 1: Core AI Analysis (Sprint 1-2)

### Sprint 1: Gemini RAG Setup

**Goal**: Replace mock analysis with real AI + RAG

**Tasks**:
1. Create legal document corpus
   - Standard contracts (PDF/TXT)
   - Key regulations excerpts
   - Precedent summaries

2. Set up Gemini File Search Store
   ```javascript
   // Create store
   const store = await ai.fileSearchStores.create({
     displayName: 'safecon-legal-corpus'
   });

   // Upload documents
   await ai.fileSearchStores.uploadDocument({
     storeId: store.id,
     file: standardContractPdf,
     metadata: { type: 'freelance', source: 'ftc' }
   });
   ```

3. Implement RAG-enhanced analysis
   ```javascript
   const analysis = await ai.models.generateContent({
     model: 'gemini-2.5-flash',
     tools: [{ fileSearch: { storeId: store.id } }],
     contents: `Analyze this contract: ${contractText}`
   });
   ```

4. Update Upload.tsx to use real analysis

### Sprint 2: OCR Integration

**Goal**: Extract text from images/PDFs

**Tasks**:
1. Install tesseract.js
2. Create OCR service module
3. Implement PDF text extraction
4. Add Korean language support
5. Show extraction progress UI

## Phase 2: Backend Foundation (Sprint 3-4)

### Sprint 3: FastAPI Setup

**Goal**: Create backend API server

**Tasks**:
1. Initialize FastAPI project structure
   ```
   backend/
   ├── app/
   │   ├── api/
   │   │   ├── auth.py
   │   │   ├── contracts.py
   │   │   └── analysis.py
   │   ├── core/
   │   │   ├── config.py
   │   │   └── security.py
   │   ├── models/
   │   └── services/
   ├── alembic/
   └── requirements.txt
   ```

2. Implement JWT authentication
3. Create contract CRUD endpoints
4. Set up PostgreSQL with SQLAlchemy
5. Deploy to server

### Sprint 4: Frontend Integration

**Goal**: Connect frontend to backend

**Tasks**:
1. Install TanStack Query
2. Create API client service
3. Replace localStorage with API calls
4. Implement auth flow (login/register)
5. Add loading/error states

## Phase 3: Enhanced Features (Sprint 5-6)

### Sprint 5: Document Management

**Tasks**:
1. File upload to S3/Minio
2. Document versioning
3. Secure download URLs
4. PDF report generation

### Sprint 6: Multi-party Signatures

**Tasks**:
1. Invite parties by email
2. Signature workflow (sequential/parallel)
3. Completion notifications
4. Signed document download

## Deployment Configuration

### Server Setup (trendy.storydot.kr)

```bash
# SSH connection
ssh -i c:\server\firstkeypair.pem ubuntu@trendy.storydot.kr

# Directory structure
/mnt/storage/law/
├── frontend/        # Vite build output
├── backend/         # FastAPI application
├── data/            # PostgreSQL data
├── uploads/         # User uploads
└── docker-compose.yml
```

### Docker Compose

```yaml
version: '3.8'
services:
  frontend:
    build: ./frontend
    ports: ["3000:80"]

  backend:
    build: ./backend
    ports: ["8000:8000"]
    environment:
      - DATABASE_URL=postgresql://...
      - GEMINI_API_KEY=${GEMINI_API_KEY}

  postgres:
    image: postgres:16
    volumes:
      - ./data/postgres:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
```

### GitHub Actions CI/CD

```yaml
name: Deploy SafeCon

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build Frontend
        run: npm ci && npm run build

      - name: Deploy to Server
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: trendy.storydot.kr
          username: ubuntu
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /mnt/storage/law
            git pull
            docker-compose up -d --build
```

## API Key Management

### Environment Variables

```bash
# .env.local (frontend)
GEMINI_API_KEY=AIzaSyAXouas6l6y93DR027tWfOyir-OZiudCwI

# .env (backend)
GEMINI_API_KEY=AIzaSyAXouas6l6y93DR027tWfOyir-OZiudCwI
DATABASE_URL=postgresql://safecon:password@localhost:5432/safecon
JWT_SECRET=your-jwt-secret
```

**SECURITY NOTE**:
- Never commit API keys to git
- Use GitHub Secrets for CI/CD
- Rotate keys periodically
