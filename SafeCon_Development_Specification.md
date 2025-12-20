# SafeCon (세이프콘) - 법률 케어 서비스 개발 명세서

> **Contract Intelligence & Provenance**  
> AI 계약 분석 + DID 전자서명 + 블록체인 공증의 3중 방어 체계

---

## 📋 목차

1. [PRD (Product Requirements Document)](#1-prd-product-requirements-document)
2. [시스템 아키텍처](#2-시스템-아키텍처)
3. [ERD (Entity Relationship Diagram)](#3-erd-entity-relationship-diagram)
4. [API 설계](#4-api-설계)
5. [인증 시스템 (JWT + DID)](#5-인증-시스템-jwt--did)
6. [AI 계약서 분석 엔진](#6-ai-계약서-분석-엔진)
7. [블록체인 공증 시스템](#7-블록체인-공증-시스템)
8. [UI/UX 설계](#8-uiux-설계)
9. [CI/CD 파이프라인](#9-cicd-파이프라인)
10. [보안 및 규제 대응](#10-보안-및-규제-대응)
11. [개발 로드맵](#11-개발-로드맵)

---

## 1. PRD (Product Requirements Document)

### 1.1 제품 개요

| 항목 | 내용 |
|------|------|
| **제품명** | SafeCon (세이프콘) |
| **슬로건** | Contract Intelligence & Provenance |
| **버전** | v1.0.0 |
| **대상 플랫폼** | Web (Next.js), Mobile (React Native) |
| **핵심 가치** | "계약, 읽지 않아도 이해하고 믿을 수 있게" |

### 1.2 문제 정의

| Pain Point | 상세 내용 |
|------------|-----------|
| **이해 불가능한 법률 용어** | "갑의 귀책사유로 인한 계약 해제 시 손해배상 청구권 불포기" - 전문가 아니면 위험 조항 판별 불가, 불리한 조건도 모르고 서명 |
| **증거력 없는 서명** | 카카오톡 합의 = 법적 효력 불확실, "서명한 적 없다" 분쟁 시 입증 책임, 위조/변조 방어 수단 부재 |
| **분쟁 시 원본 확인 불가** | "이 버전이 맞나요?" 공방, 날짜 조작 의심 시 증명 방법 없음, 공증 비용 건당 10~50만원 |

### 1.3 타겟 사용자

**페르소나 1: 프리랜서 김개발 (32세)**
- 직업: 프리랜서 개발자
- 연간 계약: 12건 (외주 계약, NDA, 용역 계약)
- Pain Point: "수정 무한 요청" 조항으로 3개월 무급 노동, 연 2회 대금 미지급
- Needs: 5분 안에 위험 조항 파악, 협상 멘트 제공, 분쟁 시 증거 확보

**페르소나 2: 사회초년생 이전세 (27세)**
- 상황: 첫 전세 계약 준비 중
- Pain Point: 용어 이해 불가 ("확정일자", "대항력", "근저당"), 전세사기 공포
- Needs: 쉬운 말로 설명, 안전 여부 명확한 판정, 부모님께 공유 가능한 보고서

### 1.4 솔루션: 3중 방어 체계

```
┌─────────────────────────────────────────────────────────────────┐
│                    SafeCon 3-Layer Defense                      │
├─────────────────────────────────────────────────────────────────┤
│  Layer 1: AI Translator (읽지 않아도 이해)                       │
│  • 계약서 업로드 → OCR → GPT-4o 분석 → 요약 + 위험 표시         │
│  • Output: 안전 점수, 조항별 해설, 협상 가이드                  │
├─────────────────────────────────────────────────────────────────┤
│  Layer 2: DID & E-Signature (서명해도 안전)                     │
│  • 본인확인(PASS) → PKI 서명 → 암호화 저장                      │
│  • Output: 법적 효력 있는 전자서명                              │
├─────────────────────────────────────────────────────────────────┤
│  Layer 3: Blockchain Notary (분쟁 시 증명)                      │
│  • SHA-256 해시 → Polygon 앵커링 → 증명서 발급                  │
│  • Output: 블록체인 등재 증명서 (QR 코드)                       │
└─────────────────────────────────────────────────────────────────┘
```

### 1.5 기능 요구사항

**FR-001: AI 계약서 분석**
- 지원 포맷: PDF, DOCX, JPG/PNG (스캔본), 최대 50MB, 100페이지
- OCR: Tesseract + Naver Clova 하이브리드, 한글 98% 정확도, 3초/페이지
- AI 분석: GPT-4o + RAG, 30초/10페이지
  - 전체 요약 (3문장)
  - 조항별 위험도 (safe/caution/warning/danger)
  - 표준 계약서 대비 편차
  - 협상 가이드 (우선순위 + 멘트)
- 안전 점수: 0~100 (위험 0-40, 주의 41-60, 조건부 안전 61-80, 안전 81-100)

**FR-002: DID 전자서명**
- 3단계 인증: Basic(이메일) → Verified(PASS) → DID(블록체인)
- DID 표준: W3C DID Core 1.0, did:polygon 메서드
- 서명 방식: 그리기, 타이핑, 이미지
- 다자 서명 지원 (순서 지정, 만료 기한)

**FR-003: 블록체인 공증**
- 해시: SHA-256 + 랜덤 솔트
- 네트워크: Polygon PoS, Merkle Tree 배치 (10분 간격)
- 비용: ~$0.01/배치, 확정 ~2분
- 증명서: PDF (증명서 번호, 해시, tx_hash, QR 코드)

**FR-004: 계약 관리**
- 버전 관리, 공유 (링크/이메일), 마일스톤 알림

### 1.6 수익 모델

| 구분 | 상품 | 가격 |
|------|------|------|
| **B2C 구독** | Free | 월 3건 분석, 기본 요약 |
| | Basic ₩9,900/월 | 무제한 분석, 전자서명 5건 |
| | Pro ₩19,900/월 | + 블록체인 공증 10건 |
| **종량제** | AI 분석 | ₩3,000/건 |
| | 전자서명 | ₩1,000/건 |
| | 블록체인 증명서 | ₩5,000/건 |
| **B2B API** | 플랫폼 연동 | ₩500~2,000/건, 연간 최소 ₩50M |

---

## 2. 시스템 아키텍처

### 2.1 전체 구조

```
┌──────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
│   Web (Next.js 14)  │  Mobile (React Native)  │  B2B API        │
└──────────────────────────────────────────────────────────────────┘
                              │
┌──────────────────────────────────────────────────────────────────┐
│                      Kong API Gateway                            │
│  Rate Limiting │ JWT Validation │ API Versioning                │
└──────────────────────────────────────────────────────────────────┘
                              │
┌──────────────────────────────────────────────────────────────────┐
│                       Service Layer                              │
│  Auth │ Contract │ AI │ OCR │ Blockchain │ DID │ Notification   │
└──────────────────────────────────────────────────────────────────┘
                              │
┌──────────────────────────────────────────────────────────────────┐
│                        Data Layer                                │
│  PostgreSQL 16 │ Redis 7 │ Pinecone │ AWS S3                    │
└──────────────────────────────────────────────────────────────────┘
                              │
┌──────────────────────────────────────────────────────────────────┐
│                     External Services                            │
│  OpenAI GPT-4o │ Polygon │ PASS Auth │ Naver Clova OCR          │
└──────────────────────────────────────────────────────────────────┘
```

### 2.2 기술 스택

| 영역 | 기술 |
|------|------|
| **Frontend** | Next.js 14, React Native 0.73, TypeScript, Tailwind CSS, Zustand |
| **Backend** | FastAPI 0.110, Python 3.12, SQLAlchemy 2.0, Celery |
| **AI** | OpenAI GPT-4o, text-embedding-3-small, LangChain, Pinecone |
| **OCR** | Tesseract 5.x, Naver Clova OCR |
| **Blockchain** | Polygon PoS, Solidity 0.8.20, web3.py |
| **Database** | PostgreSQL 16, Redis 7.2 |
| **Infra** | Docker, Kubernetes (EKS), GitHub Actions, ArgoCD |

---

## 3. ERD (Entity Relationship Diagram)

### 3.1 핵심 테이블

```sql
-- 사용자
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    auth_level VARCHAR(20) DEFAULT 'basic', -- basic, verified, did
    subscription_tier VARCHAR(20) DEFAULT 'free'
);

CREATE TABLE user_dids (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    did_uri VARCHAR(255) NOT NULL, -- did:polygon:0x...
    did_document JSONB NOT NULL,
    public_key_hex VARCHAR(130),
    kms_key_id VARCHAR(255)
);

-- 계약서
CREATE TABLE contracts (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    title VARCHAR(500) NOT NULL,
    status VARCHAR(30) DEFAULT 'draft', -- draft, pending_signature, signed
    safety_score INTEGER
);

CREATE TABLE contract_documents (
    id UUID PRIMARY KEY,
    contract_id UUID REFERENCES contracts(id),
    file_url VARCHAR(500) NOT NULL,
    content_hash VARCHAR(64) NOT NULL,
    ocr_text TEXT
);

CREATE TABLE contract_parties (
    id UUID PRIMARY KEY,
    contract_id UUID REFERENCES contracts(id),
    role VARCHAR(20) NOT NULL, -- party_a, party_b
    user_id UUID REFERENCES users(id),
    external_email VARCHAR(255),
    signed_at TIMESTAMPTZ,
    signature_data TEXT
);

-- AI 분석
CREATE TABLE ai_analyses (
    id UUID PRIMARY KEY,
    contract_id UUID REFERENCES contracts(id),
    safety_score INTEGER NOT NULL,
    summary TEXT NOT NULL,
    model_version VARCHAR(50)
);

CREATE TABLE analysis_clauses (
    id UUID PRIMARY KEY,
    analysis_id UUID REFERENCES ai_analyses(id),
    clause_text TEXT NOT NULL,
    risk_level VARCHAR(20) NOT NULL, -- safe, caution, warning, danger
    explanation TEXT NOT NULL,
    suggestion TEXT,
    negotiation_script TEXT,
    embedding VECTOR(1536)
);

-- 블록체인
CREATE TABLE blockchain_records (
    id UUID PRIMARY KEY,
    contract_id UUID REFERENCES contracts(id),
    document_hash VARCHAR(64) NOT NULL,
    merkle_root VARCHAR(64),
    merkle_proof JSONB,
    tx_hash VARCHAR(66),
    block_number BIGINT,
    status VARCHAR(20) DEFAULT 'pending'
);

CREATE TABLE certificates (
    id UUID PRIMARY KEY,
    blockchain_record_id UUID REFERENCES blockchain_records(id),
    certificate_number VARCHAR(50) UNIQUE,
    pdf_url VARCHAR(500),
    qr_code_url VARCHAR(500)
);

-- RAG 참조 데이터
CREATE TABLE standard_clauses (
    id UUID PRIMARY KEY,
    category VARCHAR(50), -- fair_trade, real_estate
    clause_type VARCHAR(100), -- termination, penalty
    standard_text TEXT NOT NULL,
    source VARCHAR(255),
    embedding VECTOR(1536)
);
```

---

## 4. API 설계

### 4.1 인증 API

```yaml
POST /auth/register
  Request: { email, password, name }
  Response: { user_id, email, auth_level }

POST /auth/login
  Request: { email, password, device_fingerprint }
  Response: { access_token, refresh_token, user }

POST /auth/pass/request
  Request: { name, phone, birth_date, carrier }
  Response: { request_id, redirect_url }

POST /auth/pass/verify
  Request: { request_id, tx_id }
  Response: { verified, ci, auth_level: "verified" }

POST /auth/did/create (Requires: verified)
  Response: { did_uri, did_document, auth_level: "did" }
```

### 4.2 계약서 API

```yaml
POST /contracts
  Request: { title, contract_type, parties[], expires_at }
  Response: { id, status, share_url }

POST /contracts/{id}/documents (multipart/form-data)
  Request: file, auto_analyze
  Response: { document_id, content_hash, analysis_job_id }

GET /contracts/{id}
  Response: { id, title, status, safety_score, documents, parties, latest_analysis }
```

### 4.3 AI 분석 API

```yaml
POST /ai/analyze
  Request: { contract_id, document_id, analysis_type }
  Response: { analysis_id, status: "processing", websocket_channel }

GET /ai/analysis/{id}
  Response:
    safety_score: 72
    summary: "위약금 조항(제8조)에서 불리한 내용 발견"
    clauses:
      - clause_number: 8
        clause_title: "위약금"
        risk_level: "warning"
        explanation: "지체상금 일 1%는 표준의 3배"
        suggestion: "일 0.1~0.3%로 협의"
        negotiation_script: "통상적으로 0.1~0.3%가..."
    negotiation_guide:
      priority_items: [...]
```

### 4.4 전자서명 API

```yaml
POST /contracts/{id}/sign
  Request:
    party_id: uuid
    signature_data: { type: "draw", data: "base64..." }
    verification: { method: "did", did_signature: "0x..." }
    consent: { terms_agreed: true, content_reviewed: true }
  Response: { signed: true, contract_status, blockchain_status }
```

### 4.5 블록체인 API

```yaml
POST /blockchain/anchor
  Request: { contract_id, document_id, priority }
  Response: { anchor_id, document_hash, status: "queued" }

GET /blockchain/anchor/{id}
  Response:
    status: "confirmed"
    merkle_root: "0x..."
    tx_hash: "0x..."
    block_number: 52345678
    certificate: { certificate_number, pdf_url, verification_url }

POST /blockchain/verify
  Request: { document_hash } or { file }
  Response: { verified: true/false, anchored_at, tx_hash }
```

---

## 5. 인증 시스템 (JWT + DID)

### 5.1 3단계 인증 레벨

| Level | 방법 | 용도 | 제한 |
|-------|------|------|------|
| **Basic** | 이메일 + 비밀번호 | 조회, 분석 (제한) | 서명 불가 |
| **Verified** | PASS 본인인증 | 전자서명, 분석 (무제한) | - |
| **DID** | Polygon DID 생성 | 블록체인 서명 | 최고 수준 |

### 5.2 JWT 구조

```python
# Access Token (30분)
{
    "iss": "safecon.io",
    "sub": "user_id",
    "exp": 1705320000,
    "jti": "unique_token_id",
    "email": "user@example.com",
    "auth_level": "verified",  # basic, verified, did
    "tier": "basic",           # free, basic, pro
    "family": "rotation_id",
    "type": "access"
}

# RS256 서명, Refresh Token Rotation 적용
```

### 5.3 DID Document (W3C 표준)

```json
{
  "@context": ["https://www.w3.org/ns/did/v1"],
  "id": "did:polygon:0x1234...abcd",
  "verificationMethod": [{
    "id": "did:polygon:0x1234...abcd#key-1",
    "type": "EcdsaSecp256k1VerificationKey2019",
    "controller": "did:polygon:0x1234...abcd",
    "publicKeyHex": "04..."
  }],
  "authentication": ["did:polygon:0x1234...abcd#key-1"]
}
```

---

## 6. AI 계약서 분석 엔진

### 6.1 분석 파이프라인

```
Document Upload
      │
      ▼
┌──────────────┐
│  OCR 처리    │ ← Tesseract + Clova
└──────────────┘
      │
      ▼
┌──────────────┐
│  조항 분리   │ ← 제N조 패턴 인식
└──────────────┘
      │
      ▼
┌──────────────┐
│  RAG 검색    │ ← Pinecone (표준약관, 판례)
└──────────────┘
      │
      ▼
┌──────────────┐
│  LLM 분석    │ ← GPT-4o + Retrieved Context
└──────────────┘
      │
      ▼
┌──────────────┐
│  후처리      │ ← 점수 정규화, 우선순위 계산
└──────────────┘
```

### 6.2 위험 패턴 탐지 (Rule-based)

| 패턴 | 설명 | 기본 점수 |
|------|------|-----------|
| `일방.*해지` | 일방적 해지 조항 | 70 |
| `지체상금.*[1-9]\d*%` | 과도한 지체상금 | 75 |
| `모든.*지적재산권.*귀속` | IP 귀속 모호 | 55 |
| `무한.*책임` | 무제한 책임 | 80 |
| `자동.*갱신` | 자동 갱신 | 45 |
| `손해배상.*예정.*[5-9]\d*%` | 과도한 손해배상 | 70 |

### 6.3 RAG Vector DB 구성

- 공정위 표준약관 (용역, 임대차, 판매)
- 고용노동부 표준근로계약서
- 국토교통부 표준임대차계약서
- 대법원 판례 (계약해제, 손해배상, 위약금)

### 6.4 LLM 프롬프트 핵심

```
당신은 한국의 계약법 전문가입니다.
중요: 법률 조언이 아닌 정보 제공만 합니다.

규칙:
1. 어려운 용어 → 쉬운 말로 설명
2. 표준 계약서와 비교
3. 을(약자) 입장에서 분석
4. 객관적 사실만 (예: "표준보다 3배 높습니다" ✅)
5. 주관적 조언 금지 (예: "서명하지 마세요" ❌)
```

---

## 7. 블록체인 공증 시스템

### 7.1 스마트 컨트랙트

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SafeConAnchor {
    mapping(bytes32 => uint256) public anchorTimestamps;
    mapping(bytes32 => bool) public anchored;

    event Anchored(
        bytes32 indexed merkleRoot,
        uint256 timestamp,
        uint256 documentCount,
        string batchId
    );

    function anchorBatch(
        bytes32 merkleRoot,
        uint256 documentCount,
        string calldata batchId
    ) external onlyAuthorized {
        require(!anchored[merkleRoot], "Already anchored");
        anchored[merkleRoot] = true;
        anchorTimestamps[merkleRoot] = block.timestamp;
        emit Anchored(merkleRoot, block.timestamp, documentCount, batchId);
    }

    function verify(bytes32 hash) external view returns (bool, uint256) {
        return (anchored[hash], anchorTimestamps[hash]);
    }
}
```

### 7.2 Merkle Tree 배치 처리

- 10분마다 대기 중인 해시들 수집
- Merkle Tree 생성 (최대 1000개/배치)
- 단일 트랜잭션으로 Root 앵커링
- 가스비 절감: 개별 $0.10 → 배치 $0.01 (98.5% 절감)

### 7.3 검증 프로세스

```
원본 파일 업로드
      │
      ▼
SHA-256 해시 재계산
      │
      ▼
Merkle Proof 검증 (로컬)
      │
      ▼
블록체인 Root 조회
      │
      ▼
증명서 발급 (PDF + QR)
```


---

## 8. UI/UX 설계

### 8.1 주요 화면 플로우

**1. 계약서 업로드**
```
메인 화면 → 파일 드래그 또는 선택 → OCR 처리 (3초/페이지) 
→ 텍스트 확인/수정 → "AI 분석하기" 클릭
```

**2. 분석 결과 화면**
```
┌────────────────────────────────────────────┐
│  안전 점수: 72/100 "조건부 안전"           │
│  ████████████░░░░░░                        │
├────────────────────────────────────────────┤
│  📋 3문장 요약                             │
│  "위약금 조항(제8조)에서 불리한 내용..."    │
├────────────────────────────────────────────┤
│  ⚠️ 우선 협상 항목                         │
│  ┌────────────────────────────────────┐   │
│  │ 🔴 제8조 위약금 - 위험              │   │
│  │    지체상금 일 1%는 표준의 3배      │   │
│  │    [협상 가이드 보기]               │   │
│  ├────────────────────────────────────┤   │
│  │ 🟠 제12조 지적재산권 - 주의         │   │
│  │    기보유 IP 제외 조항 없음         │   │
│  └────────────────────────────────────┘   │
├────────────────────────────────────────────┤
│  [전자서명] [블록체인 공증] [PDF 저장]     │
└────────────────────────────────────────────┘
```

**3. 협상 가이드**
- 협상 순서 (영향도/난이도 표시)
- 대화 시나리오 (시작 → 각 조항 → 마무리)
- 체크리스트 복사, 카톡 공유

**4. 블록체인 증명서**
- 증명서 번호: SC-2024-000123
- 문서 해시, Merkle Root, tx_hash, 블록 번호
- QR 코드 (검증 URL)

---

## 9. CI/CD 파이프라인

### 9.1 GitHub Actions 워크플로우

```yaml
name: SafeCon CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  code-quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Lint (Ruff)
        run: ruff check .
      - name: Type check (mypy)
        run: mypy app/
      - name: Security (Bandit)
        run: bandit -r app/

  backend-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
      redis:
        image: redis:7
    steps:
      - uses: actions/checkout@v4
      - name: Run tests
        run: pytest tests/ --cov=app

  frontend-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run lint && npm run test

  build-and-push:
    needs: [code-quality, backend-test, frontend-test]
    runs-on: ubuntu-latest
    if: github.event_name == 'push'
    steps:
      - name: Build Docker images
        run: docker buildx build --push ...

  deploy-staging:
    needs: [build-and-push]
    if: github.ref == 'refs/heads/develop'
    environment: staging

  deploy-production:
    needs: [build-and-push]
    if: github.ref == 'refs/heads/main'
    environment: production
```

### 9.2 Kubernetes 배포

```yaml
# HPA (Horizontal Pod Autoscaler)
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: safecon-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: safecon-api
  minReplicas: 3
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

---

## 10. 보안 및 규제 대응

### 10.1 보안 아키텍처 (4 Layer)

| Layer | 구성 |
|-------|------|
| **Network** | AWS WAF, Shield (DDoS), VPC Private Subnets |
| **Application** | TLS 1.3, JWT RS256, Rate Limiting, Input Validation |
| **Data** | AES-256-GCM, Field-Level Encryption, AWS KMS |
| **Compliance** | PIPA 준수, Audit Logging, 연 1회 침투 테스트 |

### 10.2 규제 대응 전략

**변호사법 준수**
- AI 출력물은 "정보 제공"으로 한정
- 금지: "서명하지 마세요" ❌, "이 계약은 무효" ❌
- 허용: "이 비율은 표준의 3배입니다" ✅ (팩트)
- 면책 조항: "본 결과는 참고용 정보이며 법적 효력이 없습니다. 최종 검토는 법률 전문가와 진행하시기 바랍니다."

**전자서명법 준수**
- PKI 기반 서명 (공인전자서명 요건)
- 본인확인: PASS 연동
- 무결성: SHA-256 + 블록체인 앵커링
- 부인방지: 타임스탬프

**개인정보보호법 준수**
- 수집 동의 (필수/선택 구분)
- 암호화 저장 (AES-256)
- 파기: 탈퇴 시 30일 내 삭제
- RTBF: 삭제 요청 7일 내 처리

---

## 11. 개발 로드맵

### Phase 1: MVP (Month 1-6)
**목표**: AI 계약서 분석 핵심 기능 출시
**예산**: 약 2억원 / **인원**: 3명

| 기간 | 내용 |
|------|------|
| M1-2 | 개발환경, DB, 인증(JWT+PASS), OCR 파이프라인 |
| M3-4 | RAG 구축, GPT-4o 프롬프트, 위험 패턴 탐지 |
| M5-6 | 웹 프론트엔드, 베타 테스트(50명), 정식 출시 |

**MVP 범위**: ✅ 업로드, OCR, AI 분석, 협상 가이드, PDF 저장 / ❌ 전자서명, 블록체인

### Phase 2: 전자서명 + 블록체인 (Month 7-12)
**목표**: 전자서명 및 블록체인 공증 추가
**예산**: 약 3억원 / **인원**: 5명

| 기간 | 내용 |
|------|------|
| M7-8 | DID 시스템, 서명 UI, 다자 서명 |
| M9-10 | 스마트 컨트랙트, Merkle 배치, 증명서 |
| M11-12 | 모바일 앱, 구독 결제, 앱스토어 출시 |

### Phase 3: B2B 확장 (Year 2+)
**목표**: B2B API 및 플랫폼 연동
**예산**: 약 5억원 / **인원**: 10명

- API 문서화, SDK 개발
- 플랫폼 연동 (크몽, 숨고, 당근마켓)
- 화이트라벨 솔루션
- 해외 진출 (동남아)

### 수익 전망

| 연도 | 주요 수익 | 합계 |
|------|-----------|------|
| **Year 1** | 구독 ₩72M + 종량 ₩15M + 증명서 ₩5M | **₩92M** |
| **Year 2** | 구독 ₩336M + B2B ₩150M + 기타 ₩70M | **₩556M** |
| **Year 3** | 구독 ₩1,440M + B2B ₩800M + 화이트라벨 ₩400M | **₩2,810M** |

---

## 12. 부록

### 12.1 환경 변수

```bash
# Application
APP_ENV=development
APP_SECRET_KEY=...

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/safecon
REDIS_URL=redis://localhost:6379/0

# JWT
JWT_PRIVATE_KEY_PATH=/secrets/jwt_private.pem
JWT_PUBLIC_KEY_PATH=/secrets/jwt_public.pem

# AI
OPENAI_API_KEY=sk-...
PINECONE_API_KEY=...

# Blockchain
POLYGON_RPC_URL=https://polygon-rpc.com
CONTRACT_ADDRESS=0x...
ANCHOR_WALLET_PRIVATE_KEY=0x...

# External
PASS_CLIENT_ID=...
NAVER_CLOVA_SECRET=...
```

### 12.2 주요 에러 코드

| 코드 | 메시지 |
|------|--------|
| AUTH_001 | 이메일 또는 비밀번호가 올바르지 않습니다 |
| AUTH_002 | 토큰이 만료되었습니다 |
| AUTH_004 | 본인인증이 필요합니다 |
| AUTH_005 | DID 인증이 필요합니다 |
| CONTRACT_001 | 계약서를 찾을 수 없습니다 |
| CONTRACT_002 | 이미 서명된 계약서입니다 |
| DOC_001 | 지원하지 않는 파일 형식입니다 |
| DOC_002 | 파일 크기가 너무 큽니다 (최대 50MB) |
| AI_001 | AI 분석 처리 중 오류가 발생했습니다 |
| AI_002 | 일일 분석 한도를 초과했습니다 |
| CHAIN_001 | 블록체인 네트워크 오류입니다 |
| CHAIN_003 | 문서가 블록체인에 등록되지 않았습니다 |
| RATE_001 | 요청 한도를 초과했습니다 |

---

**문서 정보**
- 버전: 1.0.0
- 최종 수정일: 2024-01-15
- 작성자: SafeCon Development Team
- 문의: dev@safecon.io
