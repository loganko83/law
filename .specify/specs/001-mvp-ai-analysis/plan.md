# Implementation Plan: MVP AI Contract Analysis

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Frontend (React/Vite)                  │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐│
│  │  i18next    │ │   Views     │ │     Services        ││
│  │  (ko/en)    │ │  (Upload,   │ │  (geminiClient,     ││
│  │             │ │   Report)   │ │   contractAnalysis) ││
│  └─────────────┘ └─────────────┘ └─────────────────────┘│
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                   Google Gemini API                      │
│  ┌─────────────────────┐  ┌───────────────────────────┐ │
│  │  gemini-2.5-flash   │  │  Gemini File Search (RAG) │ │
│  │  Contract Analysis  │  │  Legal Corpus             │ │
│  └─────────────────────┘  └───────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Implementation Phases

### Phase 1: i18n Setup (Current)
1. ✅ Install i18next, react-i18next, language detector
2. ✅ Create translation files (ko/en)
3. ✅ Configure i18n with Korean as default
4. 🔄 Integrate translations in all components
5. Add language switcher to UI

### Phase 2: AI Analysis Integration
1. ✅ Create geminiClient service
2. ✅ Create contractAnalysis service with risk patterns
3. ✅ Update Upload view to use real analysis
4. Connect analysis results to Report view
5. Add error handling and retry logic

### Phase 3: RAG Enhancement
1. Prepare legal document corpus
2. Create Gemini FileSearchStore
3. Upload Korean standard contracts
4. Integrate RAG into analysis pipeline

### Phase 4: Deployment
1. Docker containerization
2. GitHub Actions CI/CD
3. Deploy to production server

## File Changes Required

### New Files
- `i18n.ts` - i18next configuration ✅
- `locales/ko/common.json` - Korean translations ✅
- `locales/en/common.json` - English translations ✅
- `components/LanguageSwitcher.tsx` - Language toggle ✅
- `services/geminiClient.ts` - Gemini API client ✅
- `services/contractAnalysis.ts` - Analysis logic ✅
- `.specify/` - Spec-kit documentation ✅

### Modified Files
- `index.tsx` - Import i18n ✅
- `views/Home.tsx` - Add i18n, language switcher 🔄
- `views/Upload.tsx` - Add i18n, real analysis ✅
- `views/Report.tsx` - Add i18n
- `views/LegalQA.tsx` - Add i18n
- `views/Profile.tsx` - Add i18n, language settings
- `components/Layout.tsx` - Add i18n for nav

## Environment Variables

```bash
GEMINI_API_KEY=AIzaSyAXouas6l6y93DR027tWfOyir-OZiudCwI
```

## Testing Checklist

- [ ] Language switches correctly between ko/en
- [ ] All UI text displays in selected language
- [ ] Contract upload works with various file types
- [ ] AI analysis returns valid results
- [ ] Risk patterns detected correctly
- [ ] Error states handled gracefully
