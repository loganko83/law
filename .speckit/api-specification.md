# SafeCon API Specification v2.0

## Base Information

| Item | Value |
|------|-------|
| Base URL | `https://trendy.storydot.kr/law/api/v1` |
| Auth | Bearer JWT Token |
| Content-Type | application/json |
| API Version | v1 |

---

## Authentication APIs

### POST /auth/register

Create a new user account.

**Request**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "Hong Gildong"
}
```

**Response (201)**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "Hong Gildong",
  "authLevel": "basic",
  "subscriptionTier": "free",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

**Errors**
- 400: Invalid email format / Password too weak
- 409: Email already registered

---

### POST /auth/login

Authenticate user and get tokens.

**Request**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200)**
```json
{
  "accessToken": "eyJhbGciOiJSUzI1NiIs...",
  "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2g...",
  "tokenType": "Bearer",
  "expiresIn": 1800,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "Hong Gildong",
    "authLevel": "basic",
    "didAddress": null
  }
}
```

**Errors**
- 401: Invalid credentials
- 429: Too many login attempts

---

### POST /auth/refresh

Refresh access token.

**Request**
```json
{
  "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2g..."
}
```

**Response (200)**
```json
{
  "accessToken": "eyJhbGciOiJSUzI1NiIs...",
  "refreshToken": "bmV3IHJlZnJlc2ggdG9rZW4...",
  "tokenType": "Bearer",
  "expiresIn": 1800
}
```

---

### POST /auth/logout

Invalidate refresh token.

**Headers**
```
Authorization: Bearer {accessToken}
```

**Response (204)**: No content

---

## User APIs

### GET /users/me

Get current user profile.

**Headers**
```
Authorization: Bearer {accessToken}
```

**Response (200)**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "Hong Gildong",
  "authLevel": "did",
  "didAddress": "did:sw:org123:0x1234abcd...",
  "didStatus": "CONFIRMED",
  "subscriptionTier": "basic",
  "profile": {
    "businessType": "Freelance Developer",
    "businessDescription": "Web frontend development for startups",
    "legalConcerns": "Payment delays, IP issues"
  },
  "createdAt": "2024-01-15T10:30:00Z"
}
```

---

### PATCH /users/me

Update user profile.

**Request**
```json
{
  "name": "Kim Developer",
  "profile": {
    "businessType": "Freelance Developer",
    "businessDescription": "Full-stack development",
    "legalConcerns": "Contract disputes"
  }
}
```

**Response (200)**: Updated user object

---

### POST /users/me/did

Create DID for current user (requires authLevel: basic+).

**Response (202)**
```json
{
  "didAddress": "did:sw:org123:0x1234abcd...",
  "status": "PENDING",
  "message": "DID creation initiated. Waiting for blockchain confirmation."
}
```

**Errors**
- 400: User already has DID
- 403: Insufficient auth level

---

### GET /users/me/did/status

Check DID confirmation status.

**Response (200)**
```json
{
  "didAddress": "did:sw:org123:0x1234abcd...",
  "status": "CONFIRMED",
  "txHash": "0xabcd1234...",
  "blockNumber": 12345678,
  "confirmedAt": "2024-01-15T10:35:00Z"
}
```

---

## Contract APIs

### POST /contracts

Create a new contract.

**Request**
```json
{
  "title": "Web Development Service Contract",
  "type": "freelance",
  "parties": [
    {
      "role": "party_a",
      "name": "ABC Corp",
      "email": "contact@abc.com"
    },
    {
      "role": "party_b",
      "name": "Kim Developer",
      "email": "kim@dev.com"
    }
  ]
}
```

**Response (201)**
```json
{
  "id": "uuid",
  "title": "Web Development Service Contract",
  "type": "freelance",
  "status": "draft",
  "parties": [...],
  "documents": [],
  "timeline": [
    {
      "date": "2024-01-15",
      "title": "Contract created",
      "completed": true
    }
  ],
  "createdAt": "2024-01-15T10:30:00Z"
}
```

---

### GET /contracts

List user's contracts with pagination and filtering.

**Query Parameters**
| Param | Type | Description |
|-------|------|-------------|
| limit | int | Items per page (default: 20, max: 100) |
| offset | int | Skip items (default: 0) |
| status | string | Filter by status (draft, reviewing, signed, etc.) |
| type | string | Filter by type (freelance, rental, etc.) |
| from_date | string | Filter by creation date (ISO format) |
| to_date | string | Filter by creation date (ISO format) |

**Response (200)**
```json
{
  "items": [
    {
      "id": "uuid",
      "title": "Web Development Service Contract",
      "type": "freelance",
      "status": "reviewing",
      "safetyScore": 72,
      "partyName": "ABC Corp",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 15,
  "limit": 20,
  "offset": 0
}
```

---

### GET /contracts/{id}

Get contract details.

**Response (200)**
```json
{
  "id": "uuid",
  "title": "Web Development Service Contract",
  "type": "freelance",
  "status": "reviewing",
  "parties": [...],
  "documents": [
    {
      "id": "uuid",
      "version": 1,
      "fileName": "contract_v1.pdf",
      "fileSize": 245678,
      "contentHash": "sha256:abc123...",
      "uploadedAt": "2024-01-15T10:35:00Z"
    }
  ],
  "analysis": {
    "id": "uuid",
    "safetyScore": 72,
    "summary": "Contract has moderate risk...",
    "risks": [...],
    "createdAt": "2024-01-15T10:40:00Z"
  },
  "signatures": [],
  "blockchainRecord": null,
  "timeline": [...],
  "createdAt": "2024-01-15T10:30:00Z"
}
```

---

### PATCH /contracts/{id}

Update contract (only draft status).

**Request**
```json
{
  "title": "Updated Contract Title",
  "parties": [...]
}
```

**Response (200)**: Updated contract object

**Errors**
- 400: Cannot update signed contract

---

### DELETE /contracts/{id}

Soft delete (archive) contract.

**Response (204)**: No content

---

## Document APIs

### POST /contracts/{id}/documents

Upload document to contract.

**Request** (multipart/form-data)
```
file: (binary)
auto_analyze: true
```

**Response (201)**
```json
{
  "id": "uuid",
  "contractId": "uuid",
  "version": 1,
  "fileName": "contract.pdf",
  "fileSize": 245678,
  "mimeType": "application/pdf",
  "contentHash": "sha256:abc123...",
  "ocrText": "Extracted text content...",
  "uploadedAt": "2024-01-15T10:35:00Z",
  "analysisJobId": "uuid"
}
```

**Errors**
- 400: Invalid file type / File too large
- 413: File exceeds 50MB limit

---

### GET /contracts/{id}/documents

List documents for contract.

**Response (200)**
```json
{
  "items": [
    {
      "id": "uuid",
      "version": 1,
      "fileName": "contract_v1.pdf",
      "fileSize": 245678,
      "contentHash": "sha256:abc123...",
      "uploadedAt": "2024-01-15T10:35:00Z"
    }
  ]
}
```

---

### GET /documents/{id}

Get document details with download URL.

**Response (200)**
```json
{
  "id": "uuid",
  "contractId": "uuid",
  "version": 1,
  "fileName": "contract.pdf",
  "fileSize": 245678,
  "mimeType": "application/pdf",
  "contentHash": "sha256:abc123...",
  "ocrText": "Extracted text...",
  "downloadUrl": "https://s3.../presigned-url?expires=3600",
  "uploadedAt": "2024-01-15T10:35:00Z"
}
```

---

## Analysis APIs

### POST /analysis

Trigger AI analysis for contract.

**Request**
```json
{
  "contractId": "uuid",
  "documentId": "uuid",
  "useRag": true
}
```

**Response (202)**
```json
{
  "analysisId": "uuid",
  "status": "processing",
  "estimatedTime": 30
}
```

---

### GET /analysis/{id}

Get analysis result.

**Response (200)**
```json
{
  "id": "uuid",
  "contractId": "uuid",
  "documentId": "uuid",
  "safetyScore": 72,
  "summary": "This contract contains several risk points...",
  "risks": [
    {
      "id": "risk_1",
      "title": "Excessive Late Payment Penalty",
      "description": "Daily penalty of 1% is 3x higher than standard",
      "level": "HIGH",
      "clauseReference": "Article 8",
      "standardComparison": "Standard: 0.1-0.3% daily"
    },
    {
      "id": "risk_2",
      "title": "Unlimited Revisions",
      "description": "No limit on revision requests",
      "level": "MEDIUM",
      "clauseReference": "Article 5"
    }
  ],
  "suggestions": [
    "Negotiate penalty rate to 0.1-0.3%",
    "Add revision limit clause (e.g., 3 rounds)"
  ],
  "questions": [
    "What is the payment schedule?",
    "Are there any IP transfer clauses?"
  ],
  "modelVersion": "gemini-3-flash-preview",
  "createdAt": "2024-01-15T10:40:00Z"
}
```

---

## Signature APIs

### POST /contracts/{id}/sign

Sign contract with DID-based credential.

**Request**
```json
{
  "signatureType": "draw",
  "signatureData": "base64-encoded-image...",
  "consent": {
    "termsAgreed": true,
    "contentReviewed": true
  }
}
```

**Response (201)**
```json
{
  "signatureId": "uuid",
  "contractId": "uuid",
  "signerDid": "did:sw:org123:0x1234...",
  "credentialId": "vc:baas:org123:cred_abc",
  "txHash": "0xabcd1234...",
  "signedAt": "2024-01-15T11:00:00Z",
  "verified": true
}
```

**Errors**
- 400: User does not have DID
- 403: User not authorized to sign this contract

---

### GET /contracts/{id}/signatures

List signatures for contract.

**Response (200)**
```json
{
  "items": [
    {
      "id": "uuid",
      "partyId": "uuid",
      "signerDid": "did:sw:org123:0x1234...",
      "signatureType": "draw",
      "signedAt": "2024-01-15T11:00:00Z",
      "verified": true
    }
  ],
  "allSigned": false,
  "remainingParties": ["party_b"]
}
```

---

### GET /signatures/{id}/verify

Verify a signature credential.

**Response (200)**
```json
{
  "valid": true,
  "signerDid": "did:sw:org123:0x1234...",
  "contractHash": "sha256:abc123...",
  "signedAt": "2024-01-15T11:00:00Z",
  "credentialStatus": "active",
  "verifiedAt": "2024-01-15T12:00:00Z"
}
```

---

## Blockchain APIs

### POST /contracts/{id}/notarize

Anchor contract hash to Xphere blockchain.

**Response (202)**
```json
{
  "anchorId": "uuid",
  "documentHash": "sha256:abc123...",
  "status": "pending",
  "estimatedConfirmation": 120
}
```

---

### GET /contracts/{id}/blockchain

Get blockchain record for contract.

**Response (200)**
```json
{
  "id": "uuid",
  "contractId": "uuid",
  "documentHash": "sha256:abc123...",
  "merkleRoot": "0x789def...",
  "merkleProof": ["0x...", "0x..."],
  "txHash": "0xabcd1234...",
  "blockNumber": 12345678,
  "network": "xphere",
  "status": "confirmed",
  "anchoredAt": "2024-01-15T11:05:00Z"
}
```

---

### GET /verify/{hash}

Public endpoint to verify document hash.

**Response (200)**
```json
{
  "verified": true,
  "documentHash": "sha256:abc123...",
  "txHash": "0xabcd1234...",
  "blockNumber": 12345678,
  "anchoredAt": "2024-01-15T11:05:00Z",
  "verificationUrl": "https://xphere.io/tx/0xabcd1234..."
}
```

**Response (404)** if not found
```json
{
  "verified": false,
  "message": "Document hash not found on blockchain"
}
```

---

## Certificate APIs

### GET /contracts/{id}/certificate

Generate and download blockchain certificate.

**Response (200)**
```json
{
  "certificateId": "SC-2024-000123",
  "contractId": "uuid",
  "documentHash": "sha256:abc123...",
  "txHash": "0xabcd1234...",
  "blockNumber": 12345678,
  "issuedAt": "2024-01-15T11:10:00Z",
  "pdfUrl": "https://s3.../certificate.pdf?expires=3600",
  "verificationUrl": "https://trendy.storydot.kr/law/verify/SC-2024-000123"
}
```

---

## Error Response Format

All error responses follow this format:

```json
{
  "error": {
    "code": "AUTH_001",
    "message": "Invalid credentials",
    "details": {
      "field": "password",
      "reason": "Password is incorrect"
    }
  }
}
```

### Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| AUTH_001 | 401 | Invalid email or password |
| AUTH_002 | 401 | Token expired |
| AUTH_003 | 401 | Invalid token |
| AUTH_004 | 403 | Insufficient permissions |
| AUTH_005 | 403 | DID required for this action |
| VAL_001 | 400 | Invalid request body |
| VAL_002 | 400 | Missing required field |
| CTR_001 | 404 | Contract not found |
| CTR_002 | 400 | Cannot modify signed contract |
| DOC_001 | 400 | Unsupported file type |
| DOC_002 | 413 | File too large |
| AI_001 | 500 | AI analysis failed |
| AI_002 | 429 | Analysis limit exceeded |
| CHAIN_001 | 500 | Blockchain network error |
| CHAIN_002 | 404 | Hash not found on blockchain |
| RATE_001 | 429 | Rate limit exceeded |

---

## Rate Limits

| Tier | Requests/min | Analysis/month | Signatures/month |
|------|--------------|----------------|------------------|
| Free | 10 | 3 | 0 |
| Basic | 60 | Unlimited | 5 |
| Pro | 120 | Unlimited | Unlimited |
| Enterprise | 300 | Unlimited | Unlimited |

Rate limit headers:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1705312800
```

---

## Webhook Events (Future)

| Event | Description |
|-------|-------------|
| contract.created | New contract created |
| contract.analyzed | AI analysis completed |
| contract.signed | Signature added |
| contract.completed | All parties signed |
| blockchain.anchored | Hash confirmed on blockchain |
| certificate.generated | Certificate ready |

**Webhook Payload**
```json
{
  "event": "contract.signed",
  "timestamp": "2024-01-15T11:00:00Z",
  "data": {
    "contractId": "uuid",
    "signatureId": "uuid",
    "signerDid": "did:sw:org123:0x1234..."
  }
}
```
