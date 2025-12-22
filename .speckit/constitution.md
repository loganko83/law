# SafeCon Project Constitution

## Project Identity

| Item | Value |
|------|-------|
| **Name** | SafeCon |
| **Tagline** | Contract Intelligence & Provenance |
| **Version** | v2.0.0 |
| **Mission** | "Read contracts without reading, sign with confidence, prove in disputes" |

## Core Principles

### 1. User-First Legal Intelligence
- All AI outputs are informational only, NOT legal advice
- Complex legal terms must be translated to plain Korean
- Risk assessment must be objective and fact-based
- Protect the weaker party (freelancer, tenant, employee)

### 2. 3-Layer Defense System
```
Layer 1: AI Translator   - Understand contracts without reading (Gemini AI)
Layer 2: DID E-Signature - Sign with blockchain identity (DID BaaS)
Layer 3: Blockchain      - Prove in disputes (Xphere + Merkle Tree)
```

### 3. Regulatory Compliance
- **Korean Attorney Act**: AI provides information, not legal advice
- **Electronic Signature Act**: PKI-based signatures with identity verification
- **Personal Information Protection Act (PIPA)**: Encryption, consent, deletion rights
- **W3C DID Core 1.0**: Standard-compliant decentralized identifiers

---

## Technology Decisions

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19 | UI framework |
| TypeScript | 5.x | Type safety |
| Vite | 6.x | Build tool |
| TailwindCSS | 3.x | Styling |
| Framer Motion | 11.x | Animations |
| react-i18next | 15.x | Internationalization |

### AI/RAG Stack
| Technology | Purpose |
|------------|---------|
| **Google Gemini API** | Primary AI (gemini-3-flash-preview, gemini-2.5-flash) |
| **Gemini File Search** | RAG for legal document corpus |
| **Pattern Detection** | Regex-based risk pattern matching |

### DID & Authentication
| Technology | Purpose |
|------------|---------|
| **DID BaaS** | W3C DID management (internal service) |
| **JWT** | API authentication |
| **PASS** | Korean identity verification (future) |

### Blockchain
| Technology | Purpose |
|------------|---------|
| **Xphere** | EVM-compatible mainnet (chainId: 20250217) |
| **Merkle Tree** | Batch anchoring for cost optimization |
| **SHA-256** | Document hashing |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| FastAPI | 0.110+ | API server |
| Python | 3.12 | Runtime |
| PostgreSQL | 16 | Primary database |
| Redis | 7.2 | Caching, rate limiting |
| SQLAlchemy | 2.0 | ORM |

### Infrastructure
| Service | Details |
|---------|---------|
| **Server** | Ubuntu @ trendy.storydot.kr |
| **Frontend Path** | /mnt/storage/law |
| **DID BaaS Path** | /mnt/storage/did_baas |
| **DID BaaS API** | https://trendy.storydot.kr/did-baas/api/v1/ |
| **SSH Key** | C:\server\firstkeypair.pem |

---

## External Service Integration

### DID BaaS Service (Internal)
```
Base URL: https://trendy.storydot.kr/did-baas/api/v1/
Swagger: https://trendy.storydot.kr/did-baas/api/swagger-ui.html

Features:
- DID Issue/Verify/Revoke
- W3C Verifiable Credentials
- JWT-VC Support
- Zero-Knowledge Proofs
- BBS+ Selective Disclosure
```

### Xphere Blockchain
```
Network: Xphere Mainnet
Chain ID: 20250217
Type: EVM-compatible
Used by: DID BaaS for DID anchoring
```

---

## Development Standards

### Code Quality
- TypeScript strict mode enabled
- ESLint + Prettier for formatting
- All code comments in English
- No Korean text in source code (except i18n files)
- No emojis in code

### Git Workflow
```
main     - production
develop  - integration
feature/* - individual features
```

### Commit Convention
```
feat: Add new feature
fix: Bug fix
docs: Documentation
refactor: Code refactoring
test: Add/update tests
chore: Maintenance
```

### Documentation
- spec-kit format for specifications
- CLAUDE.md for AI agent context
- README.md for human developers
- Swagger/OpenAPI for API documentation

---

## Security Requirements

### Data Protection
- AES-256-GCM for sensitive data encryption
- TLS 1.3 for all communications
- Field-level encryption for PII

### Authentication
- JWT RS256 with 30-minute expiry
- Refresh token rotation
- Rate limiting per subscription tier

### Audit
- All critical operations logged
- Immutable audit trail
- PIPA compliance for data handling
