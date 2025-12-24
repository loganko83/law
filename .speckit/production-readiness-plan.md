# Production Readiness Plan

## Overview

This document outlines the comprehensive plan to bring SafeCon from MVP state to production-ready status. Based on the audit conducted on 2025-12-24, 28 concrete issues were identified across 9 categories.

## Issue Summary

| Severity | Count | Categories |
|----------|-------|------------|
| CRITICAL | 4 | PDF processing, Image OCR, JWT security, Error handling |
| HIGH | 4 | Personalization, Token storage, File validation, PWA |
| MEDIUM | 20 | AI quality, Testing, Data consistency, Offline, RAG |

## Phase 1: CRITICAL Issues (Must Fix)

### 1.1 PDF Text Extraction

**Problem**: `Upload.tsx:141-152` uses placeholder text instead of actual PDF extraction.

**Solution**:
- Use `pdf.js` library for client-side PDF text extraction
- Fallback to backend OCR for scanned PDFs

**Files to Modify**:
- `services/pdfExtractor.ts` (new)
- `views/Upload.tsx`
- `package.json`

**Implementation**:
```typescript
// services/pdfExtractor.ts
import * as pdfjsLib from 'pdfjs-dist';

export async function extractPdfText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => item.str)
      .join(' ');
    fullText += pageText + '\n';
  }

  return fullText;
}
```

**Acceptance Criteria**:
- [ ] PDF files extract actual text content
- [ ] Korean text extracted correctly (UTF-8)
- [ ] Multi-page PDFs supported
- [ ] Fallback to backend OCR if client extraction fails

---

### 1.2 Image OCR Implementation

**Problem**: `Upload.tsx:153-159` uses placeholder for image uploads.

**Solution**:
- Use Tesseract.js for client-side OCR with Korean language support
- Backend Tesseract already installed (tesseract-ocr-kor)

**Files to Modify**:
- `services/ocrService.ts` (new)
- `views/Upload.tsx`
- `package.json`

**Implementation**:
```typescript
// services/ocrService.ts
import Tesseract from 'tesseract.js';

export async function extractImageText(file: File): Promise<string> {
  const result = await Tesseract.recognize(file, 'kor+eng', {
    logger: (m) => console.log(m),
  });
  return result.data.text;
}
```

**Acceptance Criteria**:
- [ ] Camera-captured images analyzed correctly
- [ ] Korean text recognized with >90% accuracy
- [ ] Progress indicator shown during OCR
- [ ] Timeout handling for large images

---

### 1.3 JWT Secret Security

**Problem**: `config.py:24` has hardcoded default secret.

**Solution**:
- Remove default value
- Require environment variable
- Add validation on startup

**Files to Modify**:
- `backend/app/core/config.py`
- `backend/app/main.py`
- `docker-compose.yml`

**Implementation**:
```python
# config.py
JWT_SECRET_KEY: str = Field(..., description="JWT secret key - REQUIRED")

# main.py startup
if settings.JWT_SECRET_KEY == "your-super-secret-key-change-in-production":
    raise ValueError("JWT_SECRET_KEY must be changed from default value")
```

**Acceptance Criteria**:
- [ ] App fails to start with default/missing secret
- [ ] Clear error message indicates required action
- [ ] Docker compose has secure secret generation

---

### 1.4 Error Handling Completion

**Problem**: Multiple error scenarios not properly handled.

**Solution**:
- Add comprehensive try-catch with user-friendly messages
- Create error boundary component
- Add toast notifications for all failure cases

**Files to Modify**:
- `views/Upload.tsx`
- `components/ErrorBoundary.tsx` (new)
- `services/api.ts`

**Implementation**:
```typescript
// Upload.tsx - improved error handling
} catch (err) {
  console.error('Analysis failed:', err);

  let errorMessage = t('upload.analysisError');
  if (err instanceof ApiError) {
    if (err.status === 429) {
      errorMessage = t('errors.rateLimited');
    } else if (err.status === 413) {
      errorMessage = t('errors.fileTooLarge');
    }
  } else if (err.message?.includes('network')) {
    errorMessage = t('errors.networkError');
  }

  setError(errorMessage);
  addToast({ message: errorMessage, type: 'error' });
  setIsScanning(false);
}
```

**Acceptance Criteria**:
- [ ] All API errors show user-friendly messages
- [ ] Network errors have specific messaging
- [ ] Rate limit errors guide user to retry later
- [ ] ErrorBoundary catches React render errors

---

## Phase 2: HIGH Priority Issues

### 2.1 User Personalization Persistence

**Problem**: UserProfile not saved to backend.

**Solution**:
- Add PATCH endpoint for user profile
- Save on profile edit
- Load on login

**Files to Modify**:
- `backend/app/api/auth.py`
- `backend/app/schemas/user.py`
- `services/api.ts`
- `views/Profile.tsx`
- `contexts/AuthContext.tsx`

**API Endpoint**:
```python
@router.patch("/profile", response_model=UserResponse)
async def update_profile(
    profile_data: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    for field, value in profile_data.dict(exclude_unset=True).items():
        setattr(current_user, field, value)
    await db.commit()
    await db.refresh(current_user)
    return current_user
```

**Acceptance Criteria**:
- [ ] Profile changes persist across sessions
- [ ] businessType, businessDescription, legalConcerns saved
- [ ] AI analysis uses persisted profile for context

---

### 2.2 Secure Token Storage

**Problem**: Access tokens in localStorage vulnerable to XSS.

**Solution**:
- Use httpOnly cookies for refresh token
- Keep access token in memory only
- Implement silent refresh

**Files to Modify**:
- `backend/app/api/auth.py`
- `backend/app/core/security.py`
- `services/api.ts`
- `contexts/AuthContext.tsx`

**Acceptance Criteria**:
- [ ] Refresh token in httpOnly cookie
- [ ] Access token not in localStorage
- [ ] Auto-refresh before expiry
- [ ] Secure cookie flags set (SameSite, Secure)

---

### 2.3 File Upload Validation

**Problem**: Only extension checked, not file content.

**Solution**:
- Add magic byte validation
- Verify MIME type matches extension
- Scan for malicious content

**Files to Modify**:
- `backend/app/api/contracts.py`
- `backend/app/core/security.py` (new file validation)

**Implementation**:
```python
import magic

MAGIC_BYTES = {
    'pdf': b'%PDF',
    'png': b'\x89PNG',
    'jpg': b'\xff\xd8\xff',
    'docx': b'PK\x03\x04',
}

def validate_file_content(content: bytes, expected_type: str) -> bool:
    if expected_type in MAGIC_BYTES:
        return content.startswith(MAGIC_BYTES[expected_type])
    return True  # Allow txt without magic bytes
```

**Acceptance Criteria**:
- [ ] Malicious files rejected even with valid extension
- [ ] Clear error message for invalid files
- [ ] File size limits enforced

---

### 2.4 PWA Service Worker

**Problem**: Service worker file missing.

**Solution**:
- Create proper service worker with caching strategy
- Implement offline fallback page
- Cache static assets

**Files to Create**:
- `public/sw.js`
- `public/offline.html`

**Implementation**:
```javascript
// public/sw.js
const CACHE_NAME = 'safecon-v1';
const STATIC_ASSETS = [
  '/law/',
  '/law/index.html',
  '/law/offline.html',
  '/law/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/law/offline.html'))
    );
  }
});
```

**Acceptance Criteria**:
- [ ] Service worker registers successfully
- [ ] Offline page shown when network unavailable
- [ ] Static assets cached for fast loading
- [ ] Cache invalidated on new deployments

---

## Phase 3: MEDIUM Priority Issues

### 3.1 AI Analysis Quality Improvements

**Tasks**:
1. Add Korean text normalization (NFC/NFKC)
2. Expand risk pattern detection
3. Improve prompt engineering with few-shot examples
4. Add confidence scores to risk assessments

**Files to Modify**:
- `services/contractAnalysis.ts`
- `backend/app/services/ai_analyzer.py`

---

### 3.2 Testing Coverage

**Required Tests**:
1. `tests/unit/services/contractAnalysis.test.ts`
2. `tests/unit/services/pdfExtractor.test.ts`
3. `tests/unit/services/ocrService.test.ts`
4. `backend/tests/test_analysis.py`
5. `tests/e2e/upload-flow.spec.ts`

**Coverage Target**: 80% for critical paths

---

### 3.3 Data Consistency

**Tasks**:
1. Add database transactions for analysis
2. Implement optimistic locking
3. Add retry logic for failed analyses

---

### 3.4 RAG Implementation

**Tasks**:
1. Persist corpus ID to database
2. Add RAG status indicator to UI
3. Handle RAG failures gracefully with user notification

---

## Implementation Timeline

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| Phase 1 | 2-3 days | PDF/OCR working, JWT secured, Errors handled |
| Phase 2 | 2-3 days | Profile persistence, Secure tokens, PWA |
| Phase 3 | 3-4 days | AI quality, Tests, Data consistency |

**Total Estimated: 7-10 days**

## Success Criteria

1. **Functional**: All file types (PDF, images, txt) analyzed correctly
2. **Security**: No hardcoded secrets, secure token handling
3. **UX**: Clear error messages, offline support
4. **Quality**: 80% test coverage on critical paths
5. **Performance**: Analysis completes in <30 seconds

## Rollback Plan

Each phase should be deployable independently. If issues arise:
1. Revert to previous Docker image
2. Database migrations are backwards-compatible
3. Feature flags for new functionality

---

*Document Version: 1.0*
*Created: 2025-12-24*
*Status: APPROVED FOR IMPLEMENTATION*
