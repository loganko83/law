# SafeCon Improvement Plan v1.0

## Overview

This document outlines comprehensive improvements identified during the project debugging session on 2025-12-25.
Organized by priority phase with detailed implementation tasks.

**Created**: 2025-12-25
**Status**: In Progress

---

## Phase 1: Security (CRITICAL)

### SEC-101: Move Gemini API Key to Backend Only

**Status**: `[ ]` Not Started

**Problem**: API key exposed in frontend via vite.config.ts and environment variables.

**Solution**:
1. Create backend proxy endpoint for AI analysis
2. Remove GEMINI_API_KEY from frontend environment
3. Use backend-only Gemini client

**Files to Modify**:
```
backend/app/api/ai.py       - Already exists, verify usage
services/geminiClient.ts    - Remove direct API calls
services/contractAnalysis.ts - Use backend API instead
vite.config.ts              - Remove GEMINI_API_KEY exposure
.env.local                  - Remove GEMINI_API_KEY
```

**Acceptance Criteria**:
- [ ] No API keys in frontend bundle
- [ ] AI analysis works via backend proxy
- [ ] Error handling for backend failures

---

### SEC-102: Move JWT to httpOnly Cookies

**Status**: `[ ]` Not Started

**Problem**: JWT stored in localStorage is vulnerable to XSS attacks.

**Solution**:
1. Backend sets httpOnly cookie on login
2. Frontend uses credentials: 'include' for API calls
3. Implement CSRF protection with token

**Files to Modify**:
```
backend/app/api/auth.py     - Set httpOnly cookie
backend/app/core/security.py - Extract token from cookie
services/api.ts             - Add credentials: 'include'
contexts/AuthContext.tsx    - Remove localStorage usage
```

**Acceptance Criteria**:
- [ ] JWT not accessible via JavaScript
- [ ] Refresh token in httpOnly cookie
- [ ] CSRF token implemented
- [ ] Silent refresh working

---

### SEC-103: Add DID API Key Validation

**Status**: `[ ]` Not Started

**Problem**: DID BaaS API key not validated on startup.

**Solution**:
1. Validate API key format on startup
2. Test connection to DID BaaS on first request
3. Add health check for DID service

**Files to Modify**:
```
backend/app/core/config.py  - Add validation
backend/app/services/did_baas.py - Add health check
backend/app/main.py         - Startup validation
```

---

## Phase 2: Performance (HIGH)

### PERF-101: Implement React.lazy Code Splitting

**Status**: `[ ]` Not Started

**Problem**: Large bundle size, all views loaded upfront.

**Solution**:
1. Use React.lazy for view components
2. Add Suspense with loading fallbacks
3. Configure Vite for optimal chunking

**Files to Modify**:
```
App.tsx                     - Add lazy imports
components/LoadingFallback.tsx - Create fallback component
vite.config.ts              - Configure manualChunks
```

**Expected Impact**:
- Initial bundle reduced by ~40%
- Faster first contentful paint

---

### PERF-102: Split Large Components

**Status**: `[ ]` Not Started

**Problem**: Upload.tsx (647 lines), Home.tsx (406 lines) too large.

**Solution**:
1. Extract Upload.tsx into modular directory structure
2. Split Home.tsx into sections
3. Create shared hooks for logic reuse

**Files to Create**:
```
views/Upload/
  index.tsx
  UploadZone.tsx
  AnalysisProgress.tsx
  AnalysisResult.tsx
  hooks/
    useFileUpload.ts
    useAnalysis.ts

views/Home/
  index.tsx
  ContractList.tsx
  TemplateGallery.tsx
  SearchFilter.tsx
```

---

### PERF-103: Remove Unused Dependencies

**Status**: `[ ]` Not Started

**Problem**: tesseract.js included but OCR done server-side.

**Solution**:
1. Remove tesseract.js from package.json
2. Audit other unused dependencies
3. Update bundle analyzer report

---

## Phase 3: Testing (MEDIUM)

### TEST-101: Add Core Hook Tests

**Status**: `[ ]` Not Started

**Hooks to Test**:
- useAuth.ts
- useDID.ts
- useBlockchain.ts
- useSignatures.ts
- useHealthCheck.ts

**Files to Create**:
```
tests/unit/hooks/useAuth.test.ts
tests/unit/hooks/useDID.test.ts
tests/unit/hooks/useBlockchain.test.ts
tests/unit/hooks/useSignatures.test.ts
tests/unit/hooks/useHealthCheck.test.ts
```

---

### TEST-102: Add E2E Authentication Tests

**Status**: `[ ]` Not Started

**Test Scenarios**:
1. User registration flow
2. Login/logout flow
3. Token refresh flow
4. Protected route access

**Files to Create**:
```
tests/e2e/auth.spec.ts
```

---

### TEST-103: Implement IndexedDB Offline Caching

**Status**: `[ ]` Not Started

**Solution**:
1. Use idb library for IndexedDB wrapper
2. Cache contracts and analysis results
3. Sync on reconnect

**Files to Create**:
```
services/offlineStorage.ts
services/syncManager.ts
```

---

## Phase 4: Long-term Features

### FEAT-101: WebSocket Real-time Updates

**Status**: `[ ]` Not Started

**Features**:
- Analysis progress updates
- Multi-party signing notifications
- Contract status changes

---

### FEAT-102: Audit Logging

**Status**: `[ ]` Not Started

**Features**:
- User action logging
- Contract access history
- Security event tracking

---

### FEAT-103: Bulk Export

**Status**: `[ ]` Not Started

**Features**:
- Export multiple contracts as ZIP
- Include certificates and reports
- PDF/CSV export options

---

## Implementation Priority

| Phase | Priority | Est. Duration | Dependencies |
|-------|----------|---------------|--------------|
| Phase 1 | CRITICAL | 2-3 days | None |
| Phase 2 | HIGH | 2-3 days | Phase 1 |
| Phase 3 | MEDIUM | 3-4 days | Phase 2 |
| Phase 4 | LOW | 5+ days | Phase 3 |

---

## Progress Tracking

### Phase 1 Progress
- [ ] SEC-101: Move Gemini API Key to Backend
- [ ] SEC-102: Move JWT to httpOnly Cookies
- [ ] SEC-103: Add DID API Key Validation

### Phase 2 Progress
- [ ] PERF-101: React.lazy Code Splitting
- [ ] PERF-102: Split Large Components
- [ ] PERF-103: Remove Unused Dependencies

### Phase 3 Progress
- [ ] TEST-101: Add Core Hook Tests
- [ ] TEST-102: Add E2E Authentication Tests
- [ ] TEST-103: IndexedDB Offline Caching

### Phase 4 Progress
- [ ] FEAT-101: WebSocket Real-time Updates
- [ ] FEAT-102: Audit Logging
- [ ] FEAT-103: Bulk Export

---

*Last Updated: 2025-12-25*
