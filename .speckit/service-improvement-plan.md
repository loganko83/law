# SafeCon Service Improvement Plan

## Executive Summary

Based on comprehensive UX analysis, the application scores **8.2/10** for user experience. This document outlines prioritized improvements across UX, Accessibility, Performance, and Service reliability.

---

## Current Status Assessment

### Strengths
| Area | Score | Details |
|------|-------|---------|
| Onboarding Flow | 9/10 | Clean login/register with password strength indicator |
| Mobile UX | 9/10 | Mobile-first design, 44px touch targets, bottom nav |
| Loading States | 9/10 | Consistent spinners and progress feedback |
| Korean Localization | 8/10 | Comprehensive translations, user-friendly messages |
| Error Handling | 8/10 | Good recovery, fallback local analysis |
| Empty States | 7/10 | Present but inconsistent visual style |
| Accessibility | 7/10 | Good basics, missing modal focus trap |
| Performance | 6/10 | Large bundles, sequential API calls |

### Critical Issues Found
1. **Modal Accessibility**: No focus trap, focus doesn't restore on close
2. **Form Errors**: Not linked to inputs via aria-describedby
3. **Bundle Size**: PDF libraries loaded on every page (555KB)
4. **API Waterfalls**: ContractDetail makes 5+ sequential requests
5. **No Retry Logic**: Failed API calls don't retry automatically

---

## Phase 1: Critical UX Fixes (1-2 days)

### UX-001: Loading Skeletons
**Priority**: High | **Impact**: Perceived performance
**Current**: Plain spinner
**Improvement**: Skeleton UI matching content layout

```typescript
// components/Skeleton.tsx
export const ContractListSkeleton = () => (
  <div className="space-y-3 animate-pulse">
    {[1, 2, 3].map(i => (
      <div key={i} className="h-20 bg-slate-100 rounded-xl" />
    ))}
  </div>
);
```

### UX-002: File Size Indicator
**Priority**: High | **Impact**: Reduces upload failures
**Current**: No size indication until error
**Improvement**: Show max size in UI, real-time size feedback

```
Upload area should show:
"PDF, Images, Documents (Max 50MB)"
```

### UX-003: Camera Permission Guidance
**Priority**: Medium | **Impact**: Better recovery
**Current**: "Cannot access camera. Please check permissions."
**Improvement**: "Camera access needed. Tap here to open Settings"

### UX-004: Estimated Processing Time
**Priority**: Medium | **Impact**: User expectation management
**Current**: Just "Processing..."
**Improvement**: "Analyzing contract... ~30 seconds remaining"

---

## Phase 2: Accessibility Compliance (2-3 days)

### A11Y-001: Modal Focus Trap
**Priority**: Critical | **Impact**: WCAG 2.1 AA compliance

```typescript
// hooks/useFocusTrap.ts
export function useFocusTrap(isOpen: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const focusableElements = containerRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements?.[0] as HTMLElement;
    const lastElement = focusableElements?.[focusableElements.length - 1] as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
      if (e.key === 'Escape') {
        // Close modal
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    firstElement?.focus();

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return containerRef;
}
```

### A11Y-002: Form Error Association
**Priority**: High | **Impact**: Screen reader support

```tsx
// Before
<input type="email" />
{error && <p className="text-red-500">{error}</p>}

// After
<input
  type="email"
  aria-invalid={!!error}
  aria-describedby={error ? "email-error" : undefined}
/>
{error && <p id="email-error" role="alert" className="text-red-500">{error}</p>}
```

### A11Y-003: Modal ARIA Attributes
**Priority**: Medium | **Impact**: Screen reader navigation

```tsx
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
  aria-describedby="modal-description"
>
  <h2 id="modal-title">Modal Title</h2>
  <p id="modal-description">Modal description...</p>
</div>
```

---

## Phase 3: Performance Optimization (3-5 days)

### PERF-001: Lazy Load PDF Libraries
**Priority**: High | **Impact**: -550KB initial bundle

```typescript
// services/pdfExport.ts
export async function exportToPdf(content: HTMLElement) {
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import('jspdf'),
    import('html2canvas')
  ]);

  const canvas = await html2canvas(content);
  const pdf = new jsPDF();
  // ... rest of export logic
}
```

### PERF-002: Batch API Requests
**Priority**: High | **Impact**: Faster page load

```typescript
// Before (waterfall - 5 sequential calls)
const contract = await api.getContract(id);
const documents = await api.getDocuments(id);
const parties = await api.getParties(id);
const versions = await api.getVersions(id);
const anchors = await api.getAnchors(id);

// After (parallel - 1 round trip)
const [contract, documents, parties, versions, anchors] = await Promise.all([
  api.getContract(id),
  api.getDocuments(id),
  api.getParties(id),
  api.getVersions(id),
  api.getAnchors(id)
]);
```

### PERF-003: Image Compression Before Upload
**Priority**: Medium | **Impact**: Faster uploads, less bandwidth

```typescript
// services/imageCompressor.ts
export async function compressImage(file: File, maxWidth = 2048): Promise<File> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const img = await createImageBitmap(file);

  const scale = Math.min(1, maxWidth / img.width);
  canvas.width = img.width * scale;
  canvas.height = img.height * scale;

  ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob>(resolve =>
    canvas.toBlob(b => resolve(b!), 'image/jpeg', 0.85)
  );

  return new File([blob], file.name, { type: 'image/jpeg' });
}
```

### PERF-004: Request Cancellation
**Priority**: Medium | **Impact**: Prevents memory leaks

```typescript
useEffect(() => {
  const controller = new AbortController();

  fetchData({ signal: controller.signal })
    .then(setData)
    .catch(err => {
      if (err.name !== 'AbortError') setError(err);
    });

  return () => controller.abort();
}, []);
```

---

## Phase 4: Service Reliability (3-5 days)

### SVC-001: Retry with Exponential Backoff
**Priority**: High | **Impact**: Better reliability

```typescript
// services/fetchWithRetry.ts
export async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;

      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}
```

### SVC-002: Offline Queue for Actions
**Priority**: Medium | **Impact**: Offline support

```typescript
// When offline, queue the action
if (!navigator.onLine) {
  await offlineQueue.add({
    type: 'CREATE_CONTRACT',
    payload: contractData,
    timestamp: Date.now()
  });
  showToast('Saved offline. Will sync when online.');
  return;
}

// On reconnect, process queue
window.addEventListener('online', async () => {
  await offlineQueue.process();
});
```

### SVC-003: Health Check and Status Page
**Priority**: Low | **Impact**: Transparency

```
/status page showing:
- API Status: Online/Offline
- AI Service: Available/Rate Limited
- Last checked: 30 seconds ago
```

---

## Phase 5: Component Refactoring (5-7 days)

### REFACTOR-001: Split ContractDetail (1,514 lines)
```
ContractDetail/
├── index.tsx (main container)
├── ContractHeader.tsx
├── DocumentsSection.tsx
├── PartiesSection.tsx
├── TimelineSection.tsx
├── BlockchainSection.tsx
├── VersionsSection.tsx
├── ShareSection.tsx
└── hooks/
    ├── useContractData.ts
    ├── useParties.ts
    └── useVersions.ts
```

### REFACTOR-002: Split Profile (771 lines)
```
Profile/
├── index.tsx
├── ProfileHeader.tsx
├── DIDSection.tsx
├── LegalDNASection.tsx
├── PaymentMethods.tsx
├── EditProfileModal.tsx
└── PaymentModal.tsx
```

---

## Implementation Timeline

| Phase | Duration | Tasks | Priority |
|-------|----------|-------|----------|
| Phase 1 | 1-2 days | UX fixes (skeletons, file size, estimates) | P0 |
| Phase 2 | 2-3 days | Accessibility (focus trap, ARIA) | P0 |
| Phase 3 | 3-5 days | Performance (lazy load, batch, compress) | P1 |
| Phase 4 | 3-5 days | Reliability (retry, offline, health) | P1 |
| Phase 5 | 5-7 days | Refactoring (split components) | P2 |

**Total Estimated Time**: 14-22 days

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Lighthouse Performance | ~65 | 85+ |
| Lighthouse Accessibility | ~80 | 95+ |
| Initial Bundle Size | 2.3MB | 1.5MB |
| Time to Interactive | ~4s | <2s |
| API Error Rate | Unknown | <1% |
| User Task Completion | Unknown | 95%+ |

---

## Quick Wins (Can implement immediately)

1. **Add file size to upload UI** - 10 min
2. **Add alt text to camera preview** - 5 min
3. **Add role="dialog" to modals** - 15 min
4. **Show API rate limit in toast** - 10 min
5. **Add empty state icons** - 30 min

---

*Document Version: 1.0*
*Created: 2025-12-24*
*Author: Claude Code*
