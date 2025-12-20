# Tasks: MVP AI Contract Analysis

## Sprint 1: i18n Integration

### TASK-001: Complete Home.tsx i18n [IN PROGRESS]
- [x] Add useTranslation hook
- [x] Add LanguageSwitcher component
- [x] Replace hardcoded Korean text with t() calls
- [ ] Update filter labels
- [ ] Update template titles
- [ ] Update external links

### TASK-002: Update Layout.tsx with i18n
- [ ] Add useTranslation hook
- [ ] Translate nav labels (Home, Diagnosis, Legal, Profile)

### TASK-003: Update Upload.tsx with i18n
- [x] Add useTranslation hook
- [ ] Translate all UI text
- [ ] Translate progress messages
- [ ] Translate error messages

### TASK-004: Update Report.tsx with i18n
- [ ] Add useTranslation hook
- [ ] Translate score labels
- [ ] Translate risk level badges
- [ ] Translate action buttons

### TASK-005: Update LegalQA.tsx with i18n
- [ ] Add useTranslation hook
- [ ] Translate UI elements
- [ ] Add language context to AI prompts

### TASK-006: Update ContentProofGenerator.tsx with i18n
- [ ] Add useTranslation hook
- [ ] Translate form labels
- [ ] Translate generation messages

### TASK-007: Update Profile.tsx with i18n
- [ ] Add useTranslation hook
- [ ] Add language selection UI
- [ ] Translate form labels

### TASK-008: Update remaining views
- [ ] ContractDetail.tsx
- [ ] DocuSignSigning.tsx
- [ ] TemplatePreview.tsx
- [ ] LegalServices.tsx
- [ ] DocumentView.tsx

## Sprint 2: AI Analysis

### TASK-009: Test contract analysis flow
- [ ] Upload test contract
- [ ] Verify Gemini API calls
- [ ] Check risk pattern detection
- [ ] Validate score calculation

### TASK-010: Add OCR for images
- [ ] Install tesseract.js
- [ ] Implement image text extraction
- [ ] Add Korean language support

### TASK-011: Implement PDF text extraction
- [ ] Install pdf.js
- [ ] Extract text from PDFs
- [ ] Handle scanned PDFs (OCR fallback)

## Sprint 3: RAG Setup

### TASK-012: Prepare legal corpus
- [ ] Collect Korean standard contracts
- [ ] Collect key regulations
- [ ] Format for upload

### TASK-013: Create Gemini FileSearchStore
- [ ] Initialize store via API
- [ ] Upload documents
- [ ] Configure chunking

### TASK-014: Integrate RAG into analysis
- [ ] Query FileSearch before analysis
- [ ] Include context in prompts
- [ ] Display citations in results

## Sprint 4: Deployment

### TASK-015: Build and test locally
- [ ] npm run build
- [ ] Test production build
- [ ] Verify all features work

### TASK-016: Deploy to server
- [ ] Push to GitHub
- [ ] Trigger CI/CD
- [ ] Verify deployment
- [ ] Test on production URL

## Priority Matrix

| Task | Priority | Effort | Status |
|------|----------|--------|--------|
| TASK-001 | P0 | S | IN PROGRESS |
| TASK-002 | P0 | S | TODO |
| TASK-003 | P0 | S | PARTIAL |
| TASK-004 | P0 | S | TODO |
| TASK-005 | P1 | M | TODO |
| TASK-006 | P1 | M | TODO |
| TASK-007 | P1 | S | TODO |
| TASK-008 | P1 | M | TODO |
| TASK-009 | P0 | M | TODO |
| TASK-015 | P0 | S | TODO |
| TASK-016 | P0 | M | TODO |

**Legend**: P0=Critical, P1=Important, S=Small, M=Medium
