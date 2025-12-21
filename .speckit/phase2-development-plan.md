# SafeCon Phase 2 Development Plan

## Overview

Advanced feature development plan following initial accessibility and testing improvements.
Created: 2025-12-21
Previous Phase: Accessibility fixes, E2E testing, Bundle optimization, PDF export, Conversation history

---

## Phase 1: PWA (Progressive Web App) Implementation

### 1.1 Service Worker Setup

**Purpose**: Enable offline functionality and app-like experience

**Files to Create**:
- `public/sw.js` - Service Worker for caching
- `public/manifest.json` - Web App Manifest
- `src/registerSW.ts` - Service Worker registration

**Caching Strategy**:
```javascript
// Cache-first for static assets
// Network-first for API calls
// Stale-while-revalidate for dynamic content
```

**Offline Support**:
- [ ] Cache app shell (HTML, CSS, JS)
- [ ] Cache static assets (icons, fonts)
- [ ] Queue failed API requests
- [ ] Show offline indicator

### 1.2 Web App Manifest

**manifest.json Configuration**:
```json
{
  "name": "SafeContract - AI Legal Assistant",
  "short_name": "SafeCon",
  "start_url": "/law/",
  "display": "standalone",
  "theme_color": "#3B82F6",
  "background_color": "#F8FAFC",
  "icons": [
    { "src": "icons/icon-192.png", "sizes": "192x192" },
    { "src": "icons/icon-512.png", "sizes": "512x512" }
  ]
}
```

### 1.3 Push Notifications

**Use Cases**:
- Contract deadline reminders
- Payment due dates
- Counterparty response alerts
- Law update notifications

**Implementation**:
- [ ] Request notification permission
- [ ] Store push subscription
- [ ] Handle background push events
- [ ] Display notification UI

---

## Phase 2: UX Improvements

### 2.1 Toast Notification System

**Purpose**: Replace intrusive alert() dialogs with elegant toast notifications

**Component**: `components/Toast.tsx`

**Features**:
- Success, Error, Warning, Info variants
- Auto-dismiss with configurable duration
- Manual dismiss button
- Stacking multiple toasts
- Animation (slide-in, fade-out)

**Usage**:
```typescript
const { toast } = useToast();
toast.success('Contract saved successfully');
toast.error('Analysis failed. Please try again.');
```

### 2.2 Skeleton Loading States

**Purpose**: Improve perceived loading performance

**Components to Add**:
- `components/Skeleton.tsx` - Base skeleton component
- `components/ContractCardSkeleton.tsx` - Contract list loading
- `components/ReportSkeleton.tsx` - Analysis report loading

**Implementation**:
```tsx
<Skeleton className="h-4 w-3/4" />
<Skeleton variant="circular" className="w-10 h-10" />
<Skeleton variant="rectangular" className="h-32" />
```

### 2.3 Error Boundary

**Purpose**: Graceful error handling without app crash

**Component**: `components/ErrorBoundary.tsx`

**Features**:
- Catch React errors
- Display friendly error message
- Retry button
- Error reporting (optional)

### 2.4 Dark Mode

**Purpose**: Reduce eye strain, save battery on OLED

**Implementation**:
- [ ] Create color tokens (light/dark variants)
- [ ] Add theme context
- [ ] System preference detection
- [ ] Manual toggle in settings
- [ ] Persist preference in localStorage

**Color Scheme**:
```css
:root {
  --bg-primary: #F8FAFC;
  --text-primary: #1E293B;
}

[data-theme="dark"] {
  --bg-primary: #0F172A;
  --text-primary: #F1F5F9;
}
```

---

## Phase 3: Testing Infrastructure

### 3.1 Unit Testing Setup (Vitest)

**Configuration**: `vitest.config.ts`

**Test Structure**:
```
tests/
├── unit/
│   ├── services/
│   │   ├── contractAnalysis.test.ts
│   │   ├── conversationStorage.test.ts
│   │   └── geminiClient.test.ts
│   ├── components/
│   │   ├── Button.test.tsx
│   │   └── Toast.test.tsx
│   └── utils/
│       └── validation.test.ts
└── e2e/ (existing)
```

### 3.2 Component Testing

**Libraries**:
- @testing-library/react
- @testing-library/user-event
- vitest

**Coverage Targets**:
- Services: 90%
- Components: 80%
- Utils: 95%

### 3.3 API Mocking

**Library**: MSW (Mock Service Worker)

**Mock Handlers**:
```typescript
// mocks/handlers.ts
rest.post('/api/analyze', (req, res, ctx) => {
  return res(ctx.json(mockAnalysisResult));
});
```

---

## Phase 4: Security Enhancements

### 4.1 API Key Backend Proxy

**Problem**: API key exposed in client-side code

**Solution**: Create backend proxy endpoint

**Architecture**:
```
Client → /api/analyze → Backend Proxy → Gemini API
                            ↓
                    API Key stored in env
```

**Files to Create**:
- `api/analyze.ts` - Serverless function (Vercel/Netlify)
- Environment variable: `GEMINI_API_KEY`

### 4.2 Input Sanitization

**Purpose**: Prevent XSS and injection attacks

**Library**: DOMPurify (already installed)

**Sanitize Points**:
- User input in LegalQA
- Contract text before analysis
- Generated content display

### 4.3 Rate Limiting

**Client-side Throttling**:
```typescript
// Limit to 10 requests per minute
const throttledAnalyze = throttle(analyzeContract, 6000);
```

**Server-side** (in backend proxy):
- IP-based rate limiting
- User-based quotas

---

## Phase 5: Performance Optimization

### 5.1 Lazy Loading Views

**Current**: All views loaded upfront
**Target**: Load views on demand

**Implementation**:
```typescript
const LegalQA = lazy(() => import('./views/LegalQA'));
const Report = lazy(() => import('./views/Report'));

<Suspense fallback={<ViewSkeleton />}>
  <LegalQA />
</Suspense>
```

### 5.2 Image Optimization

**Strategies**:
- WebP format with fallback
- Responsive images (srcset)
- Lazy load below-fold images
- Compress icons

### 5.3 Virtual Scrolling

**Use Case**: Long contract lists

**Library**: @tanstack/react-virtual

**Implementation**:
```typescript
const virtualizer = useVirtualizer({
  count: contracts.length,
  getScrollElement: () => scrollRef.current,
  estimateSize: () => 80,
});
```

---

## Implementation Tasks

### Sprint 1: PWA Setup
| Task ID | Description | Priority | Status |
|---------|-------------|----------|--------|
| PWA-01 | Create manifest.json | HIGH | Pending |
| PWA-02 | Implement service worker | HIGH | Pending |
| PWA-03 | Add offline indicator | MEDIUM | Pending |
| PWA-04 | Create app icons (192, 512) | HIGH | Pending |
| PWA-05 | Register SW in index.tsx | HIGH | Pending |
| PWA-06 | Add install prompt | LOW | Pending |

### Sprint 2: UX Components
| Task ID | Description | Priority | Status |
|---------|-------------|----------|--------|
| UX-01 | Create Toast component | HIGH | Pending |
| UX-02 | Create ToastProvider context | HIGH | Pending |
| UX-03 | Replace all alert() calls | HIGH | Pending |
| UX-04 | Create Skeleton components | MEDIUM | Pending |
| UX-05 | Add skeletons to loading states | MEDIUM | Pending |
| UX-06 | Create ErrorBoundary | MEDIUM | Pending |
| UX-07 | Implement dark mode toggle | LOW | Pending |
| UX-08 | Create theme context | LOW | Pending |

### Sprint 3: Testing
| Task ID | Description | Priority | Status |
|---------|-------------|----------|--------|
| TEST-01 | Setup Vitest configuration | HIGH | Pending |
| TEST-02 | Add @testing-library/react | HIGH | Pending |
| TEST-03 | Write service unit tests | HIGH | Pending |
| TEST-04 | Write component tests | MEDIUM | Pending |
| TEST-05 | Setup MSW for API mocking | MEDIUM | Pending |
| TEST-06 | Add coverage reporting | LOW | Pending |

### Sprint 4: Security
| Task ID | Description | Priority | Status |
|---------|-------------|----------|--------|
| SEC-01 | Create API proxy endpoint | HIGH | Pending |
| SEC-02 | Move API key to backend | HIGH | Pending |
| SEC-03 | Add input sanitization | MEDIUM | Pending |
| SEC-04 | Implement client-side throttling | MEDIUM | Pending |

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Lighthouse PWA Score | 0 | > 90 |
| Lighthouse Performance | TBD | > 85 |
| Unit Test Coverage | 0% | > 80% |
| E2E Test Pass Rate | 100% | 100% |
| alert() Usage | Multiple | 0 |
| API Key Exposure | Client | Backend |

---

## Technical Decisions

### PWA Framework
**Choice**: Vite PWA Plugin (vite-plugin-pwa)
**Reason**: Native Vite integration, auto-generates SW

### Toast Library
**Choice**: Custom implementation
**Reason**: Lightweight, full control, no extra dependencies

### Testing Framework
**Choice**: Vitest
**Reason**: Native Vite integration, faster than Jest

### Dark Mode
**Choice**: CSS custom properties + context
**Reason**: No runtime overhead, smooth transitions

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| SW caching issues | HIGH | Implement cache versioning |
| Dark mode color contrast | MEDIUM | Test with a11y tools |
| Backend proxy cold start | LOW | Use edge functions |
| Test flakiness | MEDIUM | Use stable selectors |

---

## File Change Summary

### New Files
- `public/manifest.json`
- `public/sw.js`
- `src/registerSW.ts`
- `components/Toast.tsx`
- `components/ToastProvider.tsx`
- `components/Skeleton.tsx`
- `components/ErrorBoundary.tsx`
- `contexts/ThemeContext.tsx`
- `vitest.config.ts`
- `tests/unit/**/*.test.ts`
- `api/analyze.ts`

### Modified Files
- `index.html` - Add manifest link
- `index.tsx` - Register SW
- `App.tsx` - Wrap with providers
- `vite.config.ts` - Add PWA plugin
- All views - Replace alert() with toast
- `package.json` - Add new dependencies
