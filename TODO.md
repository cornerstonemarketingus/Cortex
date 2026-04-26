# Cortex Construction Hub - Estimator Fix & High-Income Roadmap

✅ **Phase 1: Fix Estimator Token Error (Complete after these steps)**

## Current Status
- [x] Plan approved
- [x] Create TODO.md ✅
- [x] Fix LLM fallback in `/app/api/estimate/generate/route.ts` (existing try/catch)
- [x] Improve local LLM summaries in `/lib/llm/router.ts` 
- [ ] Test estimator API: `curl -X POST http://localhost:3000/api/estimate/generate -H "Content-Type: application/json" -d '{"input":"1000sqft framing"}'`
- [ ] Add lead capture to estimates
- [ ] Deploy & monitor

## Phase 2: Local LLM (Ollama + Llama3.1)
- [ ] Install Ollama
- [ ] Add Ollama handler to llm router
- [ ] Test offline estimates
- [ ] Fine-tune construction model

## Phase 3: Full Hub Monetization
- [ ] AI Proposals from estimates
- [ ] CRM Autopilot
- [ ] White-label SaaS
- [ ] $100k MRR target

**Next step**: Test with `curl -X POST http://localhost:3000/api/estimate/generate -H "Content-Type: application/json" -d '{"input":"1000sqft framing in 90210"}'`

