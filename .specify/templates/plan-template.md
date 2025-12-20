# Implementation Plan: [FEATURE_NAME]

**Branch**: `[branch-name]`
**Date**: [YYYY-MM-DD]
**Spec**: `specs/[feature-number]-[feature-name]/spec.md`

## Summary

[Primary requirement + technical approach]

## Technical Context

| Aspect | Value |
|--------|-------|
| Language Version | TypeScript 5.x |
| Framework | React 19 + Vite 6 |
| AI Integration | Google Gemini API |
| Storage | LocalStorage (MVP) / PostgreSQL (Phase 2) |
| Testing | Vitest |
| Target Platform | Web (Mobile-first) |
| Performance Goal | <2s analysis response |
| Constraints | Client-side only (MVP) |

## Constitution Check

- [ ] Follows project principles
- [ ] Complies with regulatory requirements
- [ ] Uses approved technology stack

## Project Structure

### Documentation
```
.specify/
├── memory/
│   └── constitution.md
├── specs/
│   └── [feature]/
│       ├── spec.md
│       ├── plan.md
│       └── tasks.md
└── templates/
```

### Source Code
```
/
├── components/     # Reusable UI components
├── views/          # Full-screen page components
├── services/       # API clients, business logic
├── locales/        # i18n translation files
│   ├── ko/
│   └── en/
├── types.ts        # TypeScript definitions
└── App.tsx         # Main app with routing
```

## Architecture

[Diagram or description]

## Implementation Phases

### Phase 0: Research
- [ ] Review existing code
- [ ] Identify dependencies
- [ ] Document constraints

### Phase 1: Design
- [ ] Define data models
- [ ] Design API contracts
- [ ] Create UI mockups

### Phase 2: Implementation
- [ ] Implement core logic
- [ ] Build UI components
- [ ] Integrate with external services

### Phase 3: Testing & Deployment
- [ ] Write tests
- [ ] Build production
- [ ] Deploy to server

## Complexity Justification

| Constraint Violation | Justification |
|---------------------|---------------|
| [Description] | [Why necessary, alternatives rejected] |
