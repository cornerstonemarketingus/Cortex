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

## Phase 2: Estimator UI Redesign for Premium SaaS Experience

**Error Message Issue:**
```
[Local model] Received task "estimate".
Configure OPENAI_API_KEY or ANTHROPIC_API_KEY for full AI responses.
```

**What's Working:**
- ✅ Dark theme fits contractors
- ✅ Estimate card is readable
- ✅ Cost breakdown is useful
- ✅ "Thinking" animation is nice touch

**What Needs Improvement:**
- [ ] Remove/hide debug message from UI (breaking immersion)
- [ ] Heavy borders and boxed sections make it feel busy
- [ ] Fonts lack visual hierarchy
- [ ] Blue/orange color palette feels generic
- [ ] Segmented bar looks like dashboard widget, not polished SaaS
- [ ] Tight spacing makes screen feel crowded

**Redesign Inspiration:** Stripe Dashboard, Linear, Vercel, Raycast, Notion AI, Arc Browser

**New Design Direction:**
- [ ] Matte charcoal background instead of bright blue
- [ ] Frosted glass cards with subtle blur effects
- [ ] Larger, cleaner typography with strong hierarchy
- [ ] Thin accent lines instead of thick borders
- [ ] Soft animations and gradients
- [ ] Increased whitespace and breathing room
- [ ] One primary accent color (gold or electric blue)
- [ ] AI responses appearing as polished assistant output (not terminal logs)

## Phase 3: Local LLM (Ollama + Llama3.1)
- [ ] Install Ollama
- [ ] Add Ollama handler to llm router
- [ ] Test offline estimates
- [ ] Fine-tune construction model

## Phase 4: Full Hub Monetization
- [ ] AI Proposals from estimates
- [ ] CRM Autopilot
- [ ] White-label SaaS
- [ ] $100k MRR target

**Next step**: Test with `curl -X POST http://localhost:3000/api/estimate/generate -H "Content-Type: application/json" -d '{"input":"1000sqft framing in 90210"}'`

