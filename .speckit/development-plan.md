# SafeCon Development Plan

## Overview

Comprehensive development plan based on debugging results and feature requirements.
Created: 2025-12-21

---

## Phase 1: Accessibility & UX Fixes (Priority: HIGH)

### 1.1 Touch Target Size Fix (BUG-003)

**Problem**: 19 buttons smaller than 44x44px minimum touch target
**Impact**: Poor mobile usability, accessibility violation (WCAG 2.1 AA)

**Files to Update**:
- `components/Button.tsx` - Add minimum size classes
- `components/Card.tsx` - Ensure clickable areas meet minimum
- `views/Home.tsx` - Fix filter tab buttons
- `views/Upload.tsx` - Fix action buttons
- `components/Layout.tsx` - Fix bottom nav buttons

**Implementation**:
```css
/* Minimum touch target: 44x44px */
.touch-target {
  min-width: 44px;
  min-height: 44px;
}
```

### 1.2 Loading States Enhancement

**Problem**: Some async operations lack visual feedback
**Impact**: User confusion during API calls

**Files to Update**:
- `views/LegalQA.tsx` - Add typing indicator
- `views/ContentProofGenerator.tsx` - Add generation progress
- `views/Upload.tsx` - Enhance analysis progress

### 1.3 Error Message Improvements

**Problem**: Generic error messages
**Impact**: Users can't understand or resolve issues

**Implementation**:
- API key errors: "Gemini API key not configured"
- Network errors: "Connection failed. Check internet"
- File errors: "File too large (max 50MB)"

---

## Phase 2: Testing Infrastructure (Priority: HIGH)

### 2.1 Add data-testid Attributes

**Purpose**: Reliable test selectors independent of i18n

**Components to Update**:
- All buttons: `data-testid="btn-{action}"`
- Navigation: `data-testid="nav-{view}"`
- Forms: `data-testid="input-{field}"`
- Cards: `data-testid="card-{type}"`

### 2.2 Test Configuration

**Files to Create**:
- `playwright.config.ts` - Playwright configuration
- `tests/e2e/*.spec.ts` - E2E test files
- `tests/fixtures/` - Test data fixtures

---

## Phase 3: Code Quality (Priority: MEDIUM)

### 3.1 TypeScript Strict Mode

**Current Issues**:
- Some `any` types in services
- Missing null checks

**Files to Update**:
- `tsconfig.json` - Enable strict mode
- `services/*.ts` - Fix type issues

### 3.2 Component Refactoring

**Improvements**:
- Extract common patterns to hooks
- Reduce prop drilling with context
- Memoize expensive computations

---

## Phase 4: Feature Enhancements (Priority: MEDIUM)

### 4.1 Legal QA Improvements

**Features**:
- Conversation history persistence
- Pre-defined question templates
- Citation links in responses

### 4.2 Analysis Report Enhancements

**Features**:
- PDF export with styling
- Share functionality
- Comparison with standard clauses

### 4.3 Template System

**Features**:
- Template editing
- Custom template creation
- Template versioning

---

## Phase 5: Performance Optimization (Priority: LOW)

### 5.1 Bundle Optimization

**Targets**:
- Code splitting by route
- Lazy load heavy components
- Tree shake unused code

### 5.2 Runtime Performance

**Targets**:
- Memoize contract list filtering
- Virtualize long lists
- Optimize re-renders

---

## Implementation Schedule

### Sprint 1: Accessibility (Days 1-2)
- [ ] TASK-A01: Fix button minimum sizes
- [ ] TASK-A02: Add touch-target utility class
- [ ] TASK-A03: Update all small buttons
- [ ] TASK-A04: Test on mobile devices

### Sprint 2: Testing (Days 2-3)
- [ ] TASK-T01: Add data-testid to components
- [ ] TASK-T02: Create Playwright config
- [ ] TASK-T03: Write E2E tests
- [ ] TASK-T04: Set up test CI

### Sprint 3: Error Handling (Days 3-4)
- [ ] TASK-E01: Create error message constants
- [ ] TASK-E02: Add error boundaries
- [ ] TASK-E03: Improve API error handling
- [ ] TASK-E04: Add retry mechanisms

### Sprint 4: Features (Days 4-5)
- [ ] TASK-F01: PDF export for reports
- [ ] TASK-F02: Conversation history
- [ ] TASK-F03: Loading improvements

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Test Pass Rate | 89% | 100% |
| Touch Targets < 44px | 19 | 0 |
| Lighthouse Accessibility | TBD | > 90 |
| Bundle Size (gzip) | TBD | < 300KB |
| FCP | TBD | < 1.5s |

---

## Files Changed Tracking

| File | Changes | Status |
|------|---------|--------|
| components/Button.tsx | Min size 44px, size prop, testId prop | ✅ Done |
| components/Layout.tsx | Nav button 48px min, testId | ✅ Done |
| components/LanguageSwitcher.tsx | Min 44px, testId, show "KR/EN" | ✅ Done |
| views/Home.tsx | Filter buttons 44px, template buttons, testId | ✅ Done |
| views/LegalServices.tsx | Service buttons, testId | ✅ Done |
| services/contractAnalysis.ts | AnalysisError class, validation, i18n errors | ✅ Done |

## Verification Results

- **Touch Targets**: 31 buttons, 0 under 44px ✅
- **data-testid**: Added to all major interactive elements ✅
- **Error Handling**: Bilingual error messages (ko/en) ✅
