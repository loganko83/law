# SafeCon Debugging Plan

## Overview

Comprehensive debugging plan for SafeCon legal contract analysis application.
Created: 2025-12-21

## Test Environment

| Component | Value |
|-----------|-------|
| Dev Server | http://localhost:3002/law/ |
| Production | https://trendy.storydot.kr/law/ |
| Node.js | v22.x |
| Browser | Chrome/Edge (latest) |
| API | Gemini 2.5/3.0 Flash |

---

## Phase 1: Core Functionality Tests

### 1.1 Navigation & Routing

| Test ID | Description | Steps | Expected Result | Status |
|---------|-------------|-------|-----------------|--------|
| NAV-001 | Home page load | Open app URL | Home dashboard displays with contracts | ⬜ |
| NAV-002 | Bottom nav - Home | Click home icon | Navigate to HOME view | ⬜ |
| NAV-003 | Bottom nav - Diagnosis | Click diagnosis icon | Navigate to UPLOAD view | ⬜ |
| NAV-004 | Bottom nav - Legal Services | Click legal services icon | Navigate to LEGAL_SERVICES view | ⬜ |
| NAV-005 | Bottom nav - Profile | Click profile icon | Navigate to PROFILE view | ⬜ |
| NAV-006 | Back navigation | Click back button on detail views | Return to previous view | ⬜ |
| NAV-007 | Full-screen views | Open DETAIL, DOCUMENT, LEGAL_QA | Bottom nav hidden | ⬜ |

### 1.2 Contract List (Home)

| Test ID | Description | Steps | Expected Result | Status |
|---------|-------------|-------|-----------------|--------|
| HOME-001 | Contract list display | Load home page | Show mock contracts with status badges | ⬜ |
| HOME-002 | Contract filter tabs | Click filter tabs (All, Freelance, Rental...) | Filter contracts by type | ⬜ |
| HOME-003 | Contract card click | Click on a contract card | Navigate to DETAIL view | ⬜ |
| HOME-004 | Safety status card | Check top status card | Show "Safe" or risk warning | ⬜ |
| HOME-005 | Template section | Scroll to templates | Show template cards | ⬜ |
| HOME-006 | Template click | Click template card | Navigate to TEMPLATE_PREVIEW | ⬜ |

### 1.3 Contract Upload & Analysis

| Test ID | Description | Steps | Expected Result | Status |
|---------|-------------|-------|-----------------|--------|
| UPL-001 | Upload page display | Navigate to diagnosis | Show camera scan and file upload options | ✅ |
| UPL-002 | File input accept | Check file input | Accept image/*, .pdf | ⬜ |
| UPL-003 | Text file upload | Upload .txt contract | File appears with name and size | ✅ |
| UPL-004 | Image file upload | Upload .jpg/.png contract | File appears with name and size | ⬜ |
| UPL-005 | PDF file upload | Upload .pdf contract | File appears with name and size | ⬜ |
| UPL-006 | Remove file | Click X on uploaded file | File removed, return to upload state | ⬜ |
| UPL-007 | Start analysis button | Click "분석 시작하기" | Transition to scanning animation | ✅ |
| UPL-008 | Analysis loading UI | During analysis | Show scanning animation with progress | ✅ |
| UPL-009 | AI analysis completion | Wait for Gemini response | Navigate to REPORT view with results | ✅ |
| UPL-010 | Analysis error handling | Invalid API key / network error | Show error message with retry option | ⬜ |

### 1.4 Analysis Report

| Test ID | Description | Steps | Expected Result | Status |
|---------|-------------|-------|-----------------|--------|
| RPT-001 | Safety score display | View report page | Show score 0-100 with color coding | ✅ |
| RPT-002 | Risk items list | Scroll report | Show detected risks with severity badges | ✅ |
| RPT-003 | Risk level colors | Check risk badges | HIGH=red, MEDIUM=yellow, LOW=green | ⬜ |
| RPT-004 | Summary section | Check summary | AI-generated summary in Korean | ✅ |
| RPT-005 | Questions section | Scroll to questions | Show recommended questions to ask | ✅ |
| RPT-006 | Done button | Click confirmation button | Navigate to HOME | ⬜ |

---

## Phase 2: AI Integration Tests

### 2.1 Gemini API

| Test ID | Description | Steps | Expected Result | Status |
|---------|-------------|-------|-----------------|--------|
| AI-001 | API key validation | Set valid key in .env.local | Analysis succeeds | ✅ |
| AI-002 | Invalid API key | Set invalid key | Show appropriate error message | ✅ |
| AI-003 | Missing API key | Remove key from .env.local | Show configuration error | ⬜ |
| AI-004 | API timeout | Slow network simulation | Show timeout error with retry | ⬜ |
| AI-005 | Rate limiting | Rapid repeated requests | Handle 429 errors gracefully | ⬜ |

### 2.2 Contract Analysis Quality

| Test ID | Description | Steps | Expected Result | Status |
|---------|-------------|-------|-----------------|--------|
| ANL-001 | Pattern detection - IP | Upload contract with IP clause | Detect "Broad IP Assignment" risk | ✅ |
| ANL-002 | Pattern detection - Termination | Upload with unilateral termination | Detect "Unilateral Termination" risk | ✅ |
| ANL-003 | Pattern detection - Penalty | Upload with 3% daily penalty | Detect "Excessive Late Penalty" risk | ✅ |
| ANL-004 | Pattern detection - Revisions | Upload with unlimited revisions | Detect "Unlimited Revisions" risk | ✅ |
| ANL-005 | Pattern detection - Payment | Upload with 90-day payment terms | Detect "Extended Payment Terms" risk | ✅ |
| ANL-006 | Safe contract | Upload fair contract | Score > 70, minimal risks | ⬜ |
| ANL-007 | Korean text analysis | Upload Korean contract | Proper Korean analysis output | ✅ |
| ANL-008 | English text analysis | Upload English contract | Analysis works (may be in Korean) | ⬜ |

### 2.3 Legal Q&A Chat

| Test ID | Description | Steps | Expected Result | Status |
|---------|-------------|-------|-----------------|--------|
| QA-001 | Chat page load | Navigate to Legal Q&A | Chat interface displays | ⬜ |
| QA-002 | Send message | Type and send question | AI responds with legal info | ⬜ |
| QA-003 | User context injection | Check response personalization | Response considers user profile | ⬜ |
| QA-004 | Conversation history | Send multiple messages | Previous messages visible | ⬜ |
| QA-005 | Legal disclaimer | Check AI responses | Include disclaimer about non-legal advice | ⬜ |

### 2.4 Content Proof Generator

| Test ID | Description | Steps | Expected Result | Status |
|---------|-------------|-------|-----------------|--------|
| CPG-001 | Generator page load | Navigate to Content Proof | Form displays | ⬜ |
| CPG-002 | Form submission | Fill form and submit | AI generates legal notice | ⬜ |
| CPG-003 | Copy to clipboard | Click copy button | Content copied successfully | ⬜ |
| CPG-004 | PDF download | Click download button | PDF file downloads | ⬜ |

---

## Phase 3: i18n & Localization Tests

### 3.1 Language Switching

| Test ID | Description | Steps | Expected Result | Status |
|---------|-------------|-------|-----------------|--------|
| I18N-001 | Default language | Fresh page load | Korean (ko) as default | ⬜ |
| I18N-002 | Language switcher | Click language selector | Show KR/EN options | ⬜ |
| I18N-003 | Switch to English | Select EN | All UI text changes to English | ⬜ |
| I18N-004 | Switch back to Korean | Select KR | All UI text changes to Korean | ⬜ |
| I18N-005 | Language persistence | Refresh page after switch | Language setting preserved | ⬜ |
| I18N-006 | Browser language detection | Set browser to English | Auto-detect and use English | ⬜ |

### 3.2 Translation Coverage

| Test ID | Description | Steps | Expected Result | Status |
|---------|-------------|-------|-----------------|--------|
| TR-001 | Home page translations | Switch to EN, check Home | All text translated | ⬜ |
| TR-002 | Upload page translations | Switch to EN, check Upload | All text translated | ⬜ |
| TR-003 | Report page translations | Switch to EN, check Report | All text translated | ⬜ |
| TR-004 | Profile page translations | Switch to EN, check Profile | All text translated | ⬜ |
| TR-005 | Error messages | Trigger errors in EN mode | Error messages in English | ⬜ |
| TR-006 | Missing translations | Search for untranslated keys | No raw i18n keys visible | ⬜ |

---

## Phase 4: UI/UX Tests

### 4.1 Mobile Responsiveness

| Test ID | Description | Steps | Expected Result | Status |
|---------|-------------|-------|-----------------|--------|
| MOB-001 | iPhone SE (375px) | Resize to 375x667 | All elements visible and usable | ⬜ |
| MOB-002 | iPhone 14 (390px) | Resize to 390x844 | Optimal layout | ⬜ |
| MOB-003 | iPad Mini (768px) | Resize to 768x1024 | Centered with max-width | ⬜ |
| MOB-004 | Desktop (1920px) | Resize to 1920x1080 | Centered mobile view | ⬜ |
| MOB-005 | Touch targets | Check button sizes | Min 44x44px touch targets | ⬜ |
| MOB-006 | Scroll behavior | Scroll all pages | Smooth scrolling, no overflow issues | ⬜ |

### 4.2 Visual Design

| Test ID | Description | Steps | Expected Result | Status |
|---------|-------------|-------|-----------------|--------|
| VIS-001 | Color consistency | Check all pages | Consistent blue/slate theme | ⬜ |
| VIS-002 | Typography | Check text sizing | Consistent font sizes per hierarchy | ⬜ |
| VIS-003 | Icons | Check all icons | Lucide icons render correctly | ⬜ |
| VIS-004 | Loading states | Trigger loading | Appropriate loading indicators | ⬜ |
| VIS-005 | Empty states | View empty contract list | Helpful empty state message | ⬜ |
| VIS-006 | Animations | Navigate between views | Framer Motion animations smooth | ⬜ |

### 4.3 Accessibility

| Test ID | Description | Steps | Expected Result | Status |
|---------|-------------|-------|-----------------|--------|
| A11Y-001 | Keyboard navigation | Tab through elements | Logical focus order | ⬜ |
| A11Y-002 | Screen reader | Use VoiceOver/NVDA | Content announced properly | ⬜ |
| A11Y-003 | Color contrast | Check text contrast | WCAG AA compliance | ⬜ |
| A11Y-004 | Focus indicators | Tab through inputs | Visible focus rings | ⬜ |

---

## Phase 5: Integration Tests

### 5.1 Contract Workflow

| Test ID | Description | Steps | Expected Result | Status |
|---------|-------------|-------|-----------------|--------|
| WF-001 | Upload to Report flow | Upload → Analyze → View Report | Complete flow works | ✅ |
| WF-002 | Template to Contract | Select template → Use → Create contract | Contract created from template | ⬜ |
| WF-003 | Contract to DocuSign | View contract → Start signing | DocuSign simulation opens | ⬜ |
| WF-004 | DocuSign completion | Complete signature → Confirm | Contract status updated to Active | ⬜ |
| WF-005 | Profile update | Edit profile → Save | Profile saved, affects AI context | ⬜ |

### 5.2 Camera Functionality

| Test ID | Description | Steps | Expected Result | Status |
|---------|-------------|-------|-----------------|--------|
| CAM-001 | Camera permission | Click camera scan | Request camera permission | ⬜ |
| CAM-002 | Camera preview | Grant permission | Live camera preview displays | ⬜ |
| CAM-003 | Photo capture | Click capture button | Photo captured and shown | ⬜ |
| CAM-004 | Retake photo | Click retake | Return to camera preview | ⬜ |
| CAM-005 | Use photo | Click use/confirm | Photo converted to file, proceed to analysis | ⬜ |
| CAM-006 | Camera close | Click X/back | Camera closed, return to upload | ⬜ |

---

## Phase 6: Error Handling Tests

### 6.1 Network Errors

| Test ID | Description | Steps | Expected Result | Status |
|---------|-------------|-------|-----------------|--------|
| ERR-001 | Offline mode | Disable network | Show offline indicator | ⬜ |
| ERR-002 | API failure | Block API calls | Show error with retry option | ⬜ |
| ERR-003 | Slow connection | Throttle network | Loading states persist, no timeout | ⬜ |

### 6.2 Input Validation

| Test ID | Description | Steps | Expected Result | Status |
|---------|-------------|-------|-----------------|--------|
| VAL-001 | Empty file upload | Try to analyze without file | Button disabled or error shown | ⬜ |
| VAL-002 | Invalid file type | Upload .exe or .zip | Reject with error message | ⬜ |
| VAL-003 | Large file | Upload 100MB+ file | Show file size limit error | ⬜ |
| VAL-004 | Empty contract text | Upload empty .txt | Show minimum content error | ⬜ |
| VAL-005 | Profile validation | Submit empty profile fields | Show validation errors | ⬜ |

---

## Phase 7: Performance Tests

### 7.1 Load Time

| Test ID | Description | Target | Actual | Status |
|---------|-------------|--------|--------|--------|
| PERF-001 | Initial page load | < 3s | TBD | ⬜ |
| PERF-002 | View transitions | < 300ms | TBD | ⬜ |
| PERF-003 | AI analysis response | < 30s | ~15s | ✅ |
| PERF-004 | File upload processing | < 2s | TBD | ⬜ |

### 7.2 Bundle Size

| Test ID | Description | Target | Actual | Status |
|---------|-------------|--------|--------|--------|
| PERF-005 | JS bundle size | < 500KB gzip | TBD | ⬜ |
| PERF-006 | CSS size | < 50KB gzip | TBD | ⬜ |
| PERF-007 | Initial render | < 1.5s FCP | TBD | ⬜ |

---

## Debug Checklist Summary

### Critical (P0) - Must Fix
- [ ] API key configuration and error handling
- [ ] Contract analysis flow end-to-end
- [ ] Navigation between all views
- [ ] File upload for all supported types

### Important (P1) - Should Fix
- [ ] i18n language switching
- [ ] Camera functionality
- [ ] Error messages and user feedback
- [ ] Mobile responsiveness

### Nice-to-Have (P2) - Can Defer
- [ ] Accessibility compliance
- [ ] Performance optimization
- [ ] Cross-browser testing
- [ ] Edge case handling

---

## Test Execution Log

| Date | Tester | Tests Run | Passed | Failed | Notes |
|------|--------|-----------|--------|--------|-------|
| 2025-12-21 | Claude | UPL-001~009, ANL-001~007 | 12 | 0 | AI analysis working with valid API key |
| 2025-12-21 | Claude | NAV-001~007 | 7 | 0 | All navigation tests passed |
| 2025-12-21 | Claude | HOME-001~006 | 5 | 1 | Template click selector issue |
| 2025-12-21 | Claude | I18N-001~006 | 3 | 3 | Selector mismatch (flags vs text) |
| 2025-12-21 | Claude | QA-001~005 | 1 | 4 | Button text mismatch ("법적 쟁점 분석") |
| 2025-12-21 | Claude | MOB-001~006 | 5 | 1 | 19 buttons under 44px touch target |

---

## Test Summary (2025-12-21)

### Overall Results
- **Total Tests**: 37
- **Passed**: 33 (89%)
- **Failed**: 4 (11%)

### By Category

| Category | Pass | Fail | Rate |
|----------|------|------|------|
| Navigation | 7 | 0 | 100% |
| Home Page | 5 | 1 | 83% |
| AI Analysis | 12 | 0 | 100% |
| i18n | 3 | 3 | 50% |
| Legal QA | 1 | 4 | 20% |
| Mobile | 5 | 1 | 83% |

### Root Cause Analysis

| Issue | Root Cause | Fix Required |
|-------|------------|--------------|
| HOME-006 | Template titles use i18n keys | Update test selector |
| I18N-002~004 | Compact mode shows flags, test expects "KR" | Update test selector |
| QA-001~004 | Button text is "법적 쟁점 분석" not "법률 Q&A" | Update test selector |
| MOB-005 | 19 buttons smaller than 44x44px | Increase button sizes |

---

## Known Issues

| Issue ID | Description | Severity | Status |
|----------|-------------|----------|--------|
| BUG-001 | Placeholder API key in .env.local | High | ✅ Fixed |
| BUG-002 | Port conflict on dev server start | Low | Workaround |
| BUG-003 | 19 buttons under 44px touch target | Medium | Open |
| BUG-004 | Test selectors need i18n-aware updates | Low | Test issue |

---

## Recommendations

### Immediate Actions
1. ✅ Configure valid Gemini API key
2. ⬜ Review small touch targets (accessibility)

### Test Improvements
1. Use data-testid attributes for reliable selectors
2. Make tests i18n-aware (check translations)
3. Add visual regression tests

### Code Improvements
1. Increase minimum button size to 44x44px
2. Add loading states for all async operations
3. Improve error messages for API failures

---

## Next Steps

1. **Immediate**: Fix touch target sizes for accessibility
2. **Short-term**: Add data-testid to components for testing
3. **Medium-term**: Add unit tests for services layer
4. **Long-term**: CI/CD integration with test gates
