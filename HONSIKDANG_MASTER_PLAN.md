# 혼식당 (Honsikdang) — AI-Native Development Master Plan

Version: 0.1 / 2026-10-15 / Status: Proposed, not approved

## 0. How to use this document
This is the source of truth for AI coding agents. Read it before modifying code. Proposed choices are not completed features. When an external API capability or policy is uncertain, verify its current official documentation and record evidence; never fabricate behavior. Keep a decision log and update this file when decisions change.

### Global agent rules
1. Inspect repository structure, existing code, migrations, tests and package manager before writing anything. Never overwrite existing work without review.
2. Separate confirmed requirements, assumptions, and open questions. Ask only for blocking decisions; otherwise choose the smallest reversible implementation and document assumptions.
3. Plan before code: affected files, migration changes, security implications, tests and rollback.
4. Implement in small vertical slices. After each slice run typecheck, lint, unit tests and relevant integration/e2e tests. Report exact commands and results; never claim unrun tests passed.
5. No mock data or placeholder endpoints disguised as production features. Mock only in clearly named fixtures/tests.
6. Never expose secrets, service-role keys or private provider credentials in client bundles. Use least-privilege access and RLS. No production migrations or destructive commands without explicit approval.
7. Database migrations are versioned and reversible when practical. Generate types from the actual schema. No direct ad hoc production changes.
8. Add observability, error handling, accessibility, mobile UX and loading/empty states to each feature.
9. Avoid speculative abstractions, microservices, queues and external infrastructure before necessary. Prefer the existing stack.
10. Document what changed, why, tests, known gaps and next recommended task in each completion report.

## 1. Product vision
**One-line:** A community-built map of restaurants where eating alone is genuinely comfortable, searchable by situation, food, budget and meaning.

**Problem:** Generic restaurant discovery does not reliably answer solo-dining questions: one-person ordering, counter seats, awkwardness, speed, price, ambience and evidence freshness.

**Differentiator:** Structured, dated, crowd-contributed solo-dining experiences + transparent recommendation reasons. A restaurant's general quality is not equivalent to solo-dining suitability.

**Primary user:** Someone eating alone near work, school or while travelling who needs a suitable restaurant quickly.

**Primary success event:** User finds a suitable restaurant and opens directions/details; eventual feedback validates whether it was suitable.

**North-star candidate:** Weekly users who save/open directions to a restaurant with verified solo-dining data (validate instrumentation and definition).

## 2. Scope and release phases
### Phase 0 — Foundations
- Confirm initial launch region, Naver Maps product access and terms, permitted location/place data storage, identity strategy, initial data acquisition, budget.
- Repo conventions, Next.js app, Supabase local development, CI, environment schema, migration process, deployment staging, design tokens.
- Define baseline privacy policy, content reporting/moderation and data retention decisions.

### Phase 1 — MVP (P0)
- Mobile-first map/list with restaurant detail pages.
- Restaurant discovery by name/area and deterministic filters: category, distance, price band, solo-friendly features.
- Authentication for contribution actions; public read of approved restaurant content.
- Restaurant suggestion, duplicate detection, moderation workflow; structured solo-dining review create/edit/delete.
- Favorites (optional for launch if schedule tight); basic reporting and admin moderation are required before open crowd submissions.
- Loading, empty, error and permission-denied states, basic analytics and monitoring.

### Phase 2 — AI Search (P1)
- Natural-language parsing to structured constraints + semantic intent.
- SQL/PostGIS hard filters, lexical retrieval, pgvector retrieval, fusion/reranking; grounded reasons with review evidence.
- Search quality evaluation set; fallback to ordinary filters if AI fails or times out.

### Phase 3 — Today’s Recommendation (P1)
- User selects location/area, budget, food preferences, exclusions and optional mood.
- Recommend 3 diverse eligible restaurants with grounded reasons and simple exploration controls.
- Cold-start rules; record only privacy-appropriate feedback and avoid overclaiming personalization.

### Phase 4 — Personalization (P2)
- Opt-in taste profile, recommendation history, feedback-based ranking, contributor reputation and anti-abuse measures.

**Out of scope initially:** Reservations, delivery, payments, scraping prohibited content, real-time waiting times without a source, full social feed, autonomous AI agents taking external actions.

## 3. User journeys
A. Discover: grant location or enter area → view map/list → apply filters → view restaurant detail → open external directions.
B. Contribute: sign in → search existing place → select existing or propose new → fill 30-second structured review → moderation checks → publish approved content.
C. Natural-language search: input situation → parse intent → hard filter → retrieve/rank → explain why with evidence → adjust constraints.
D. Recommend: enter mood/budget/exclusions → retrieve eligible candidates → diversify → show 3 results + explanations → save or dismiss.
E. Moderation: view pending places/reports → verify sources and duplicates → approve/reject with reason and audit trail.

## 4. Functional requirements (proposed)
| ID | Requirement | Priority | Acceptance criteria |
|---|---|---|---|
| FR-001 | Map/list discovery | P0 | Approved restaurants display as markers and synchronized list; viewport and pagination bounded. |
| FR-002 | Restaurant name/area search | P0 | Search handles no results and invalid query; region scope explicit. |
| FR-003 | Structured filters | P0 | Category, max budget, radius and selected solo attributes combine predictably. |
| FR-004 | Restaurant detail | P0 | Shows known facts, source/freshness, crowd summary and individual dated reviews. |
| FR-005 | Auth | P0 | Public browsing; authenticated contribution; protected actions reject unauthenticated access. |
| FR-006 | Place suggestion | P0 | Candidate deduplication; pending status; admin decision; no unreviewed public place. |
| FR-007 | Solo review CRUD | P0 | Author edits/deletes own review; required fields validated; timestamps retained. |
| FR-008 | Report/moderate | P0 | Users can report; admin reviews; audit entries retained. |
| FR-009 | Nearby spatial search | P0 | Correct radius/order with PostGIS index and documented coordinate units. |
| FR-010 | Natural-language query | P1 | Parser emits validated schema; invalid model output handled safely. |
| FR-011 | Hybrid ranking | P1 | Hard constraints never silently relaxed; semantic matches are evidence-backed. |
| FR-012 | Explain results | P1 | Reasons cite stored approved tags/reviews, not invented facts. |
| FR-013 | Today recommendation | P1 | 3 eligible and reasonably diverse candidates, or fewer with explicit explanation. |
| FR-014 | Favorites | P1 | Private user-specific saves, deduplicated and removable. |
| FR-015 | Personalization | P2 | Explicit preference controls, deletion and measurable improvement. |

## 5. Nonfunctional requirements
- Security: RLS on all exposed tables, no anonymous writes except explicitly protected endpoints, authorization tested, input validation, abuse/rate limits, safe storage policies.
- Privacy: minimize precise-location retention; location opt-in, manual-area fallback, deletion/export flows and applicable Korean privacy compliance review.
- Accessibility: keyboard support, labels, contrast, screen-reader descriptions; responsive mobile-first UI.
- Performance targets **proposed, to benchmark**: normal search p95 < 800ms excluding external maps loading; AI search p95 < 5s in staging. Set budgets after profiling.
- Reliability: fallback search without LLM, bounded retries and timeouts, idempotent async jobs, observable failure states.
- Cost: log model tokens, embedding jobs, maps requests and storage; quotas, caching and budget alerts.
- Data provenance: per-field source, observed_at, updated_at, confidence and report mechanisms.

## 6. Architecture
Browser (Next.js + TypeScript + Tailwind) → Supabase client (Auth, public read/RLS, storage) and server functions (privileged workflows) → PostgreSQL + PostGIS + pgvector. Naver Maps SDK renders map. External place search/geocoding only through verified, licensed API paths. Supabase Edge Functions handle query parsing, embedding orchestration and trusted mutation workflows. AI provider abstracted behind interfaces; provider/model selected by evaluated cost/quality, not hardcoded.

**Important:** Naver Maps rendering, Naver local search and place data reuse rights are separate concerns. Confirm current product availability, billing, credentials, caching/retention and redistribution restrictions from official documentation before implementation. Do not scrape or persist external results without authorization. Prefer user-authored solo-dining data as the owned dataset.

## 7. Data model (initial proposal)
- `profiles(id uuid PK references auth.users, display_name, role, created_at)` — minimize PII; admin role authorization must not rely on client-writable field.
- `restaurants(id uuid PK, name, address, location geography(Point,4326), category_id, status, source_type, external_reference nullable, created_by, created_at, updated_at)` — only store external attributes when terms permit.
- `restaurant_categories(id, slug, label)`
- `restaurant_reviews(id uuid PK, restaurant_id FK, user_id FK, visited_at, solo_comfort smallint, seat_type, solo_order_available nullable boolean, price_paid nullable integer, wait_minutes nullable integer, text nullable, status, created_at, updated_at)`
- `tags(id, slug, label, kind)` and `review_tags(review_id, tag_id)`
- `restaurant_aggregates(restaurant_id PK, review_count, solo_score, computed_at)` — derived, never source of truth.
- `restaurant_embeddings(restaurant_id, model_id, content_hash, source_version, embedding vector(D), embedded_at)` — choose D after selecting model; index appropriate to dataset size.
- `favorites(user_id, restaurant_id, created_at, unique(user_id,restaurant_id))`
- `restaurant_reports(id, target_type, target_id, reporter_id, reason, status, created_at)`
- `moderation_actions(id, moderator_id, target_type, target_id, action, reason, created_at)`
- Optional later: `recommendation_events`, `user_preferences`, `search_events` (privacy-reviewed).

**Migration guidance:** enable extensions via migrations, GiST index on geography, relevant B-tree indexes on approval/status/category, uniqueness for external provider IDs only where legally stored, review indexes, check constraints on score and price. Define RLS per table and test anonymous/owner/other/admin cases. Maintain explicit soft-delete/retention policy.

## 8. Search architecture
1. Validate query, location permission/manual area, pagination and hard constraints.
2. LLM outputs a **schema-validated** query object, e.g. `{area, radius_m, max_price_krw, categories, required_features, semantic_query, sort}`; treat model output as untrusted and clamp limits.
3. Resolve area to coordinates through authorized geocoding/source.
4. SQL/PostGIS prefilter approved candidates on mandatory conditions. Never let embedding similarity override hard filters.
5. Rank with lexical search + pgvector semantic similarity (where embeddings exist); use RRF or calibrated scoring, evaluate against a labeled query set. Korean lexical tokenization must be tested; PostgreSQL default full-text search is not assumed adequate for Korean.
6. Apply crowd-evidence confidence, freshness, distance and diversity as explicit ranking signals. Do not present a subjective solo score as objective fact.
7. Return grounded reason snippets with review IDs and dates; if evidence missing, say unknown.
8. Fallback: structured filter/keyword results if LLM/embedding unavailable.

**Embedding pipeline:** approved review/tag change → queue/outbox or scheduled job → normalize owned text → content hash → embedding call → upsert by restaurant/model/version → retry with backoff. Never embed unlicensed external content. Avoid synchronous embedding on every read.

## 9. Recommendation architecture
V1 deterministic candidate retrieval and scoring: mandatory distance/budget/open-state only when verifiable, food preference, solo evidence, recency, diversity and exploration. Cold start should be explicitly supported. V2 feedback and opt-in preference history. LLM may explain grounded recommendations, but must not invent menu, operating hours, crowding or prices. Always provide a non-AI fallback.

## 10. Crowdsourcing and trust
- Structured 30-second contribution; text and images optional.
- Capture visit date separately from submission date; display uncertainty and sample size.
- Objective vs subjective fields separated. Conflict is represented, not overwritten.
- Dedupe by normalized name + geo proximity + address; admin resolution for ambiguous matches.
- Rate limit submissions, protect against duplicate/self-review abuse, support reporting and moderation.
- Publish only approved content; record edits/audit trail. User-provided photos require upload restrictions and removal workflow.
- Bootstrap data through permitted sources and genuine contributors; never manufacture reviews.

## 11. Security & operational policies
- RLS and storage bucket policies tested before launch; service-role only server-side.
- API keys in managed secrets; no secrets in git or NEXT_PUBLIC except explicitly public map keys with provider restrictions.
- SQL RPC must use safe permissions; SECURITY DEFINER only when necessary with fixed search_path and authorization checks.
- Prevent prompt injection in reviews: user-generated content is data, never instructions to agents or LLMs.
- Limit AI query length, request rate, output schema and cost; strip PII from prompts where feasible.
- CI: formatting, typecheck, lint, unit, integration tests, migration checks, secret scan; staging smoke test.
- Production deployment/migrations, external service creation and spend require user approval.

## 12. Testing and evaluation
- Unit: validation, scoring, filter semantics, parser schema, dedupe.
- DB integration: PostGIS distance, hard constraints, RLS authorization matrix, migration idempotence.
- E2E: anonymous search, sign-in, submit review, owner edit, report, admin moderation, AI fallback.
- AI quality: curated Korean query suite covering ambiguity, multiple constraints, colloquial phrases, price/radius, missing data, adversarial prompt injection. Track hard-filter violations, retrieval recall@k, ranking NDCG, grounded explanation accuracy, latency and cost.
- Load/perf: realistic seeded **synthetic** data labeled as test-only; no fabricated production content.

## 13. Suggested repository layout
```
app/                      # Next.js app routes and layouts
components/               # reusable UI
features/map/              # map integration
features/restaurants/      # search/detail/review UI
features/search/           # query UX and result cards
features/recommendations/  # today recommendations
lib/supabase/              # typed clients and auth helpers
lib/domain/                # pure validation, types and scoring
supabase/migrations/       # SQL schema and RLS
supabase/functions/        # Edge Functions
supabase/seed.sql          # local dev only, synthetic
scripts/                   # nonproduction maintenance
specs/                    # PRD, ADRs, API contracts, evals
```
Avoid creating folders not yet needed.

## 14. Implementation work packages and gates
**WP-00 Discovery:** inspect repo and official API docs; write `specs/decisions.md` and blockers. Gate: provider permissions, launch region and data rights recorded.
**WP-01 Foundation:** scaffold Next.js, local Supabase, migrations, env examples, CI. Gate: local run, typecheck, test, migration reset pass.
**WP-02 Database/security:** tables, constraints, RLS, storage rules and tests. Gate: unauthorized read/write matrix verified.
**WP-03 Map/discovery:** map SDK, viewport queries, list sync, category and distance filters. Gate: mobile e2e and map API behavior validated.
**WP-04 Contribution:** suggestion, dedupe, structured review, moderation/reporting. Gate: ownership and moderation flows tested.
**WP-05 AI search:** parsing schema, retrieval, embedding jobs, grounded explanations, fallback, evaluation. Gate: benchmark thresholds agreed and measured.
**WP-06 Recommendations:** deterministic ranker, diversity, explanations, preference inputs. Gate: candidate eligibility and missing-data cases tested.
**WP-07 Launch:** accessibility, privacy review, monitoring, budget guardrails, backup/restore rehearsal, staged release. Gate: checklist signed off.

## 15. Definition of Done
- Meets explicit acceptance criteria and documented UX states.
- Auth, RLS, validation and moderation implications addressed.
- Migrations and generated types consistent; rollback path noted.
- Tests actually run with recorded outcomes; no unverified claims.
- Observability, costs and errors handled.
- Specs/decision log updated and a short human-readable change summary delivered.

## 16. Open decisions (ask user)
1. Initial geography: one Seoul neighborhood, several neighborhoods or nationwide?
2. Web/PWA first or native app first?
3. How will initial 50–100 genuinely sourced restaurants be acquired?
4. Can contributors submit reviews immediately or must each place/review be moderated?
5. Authentication provider(s), image uploads in MVP, and public vs private profiles?
6. Preferred AI provider and monthly spending ceiling?
7. Exact Naver Maps/search products and permitted place data persistence?
8. Price representation: average spend per person, observed menu prices, or both?

---
# UNIVERSAL MASTER PROMPT — paste into any coding AI

You are the lead engineer, product architect, database/security reviewer and test engineer for **Honsikdang (혼식당)**, a mobile-first crowd-sourced solo-dining restaurant discovery platform. The authoritative specification is `HONSIKDANG_MASTER_PLAN.md` in this repository. Read it fully before changing anything.

Product: Find restaurants comfortable for eating alone using map/location, category/budget/solo-specific filters, dated crowd reviews, natural-language hybrid retrieval and a grounded “What should I eat today?” recommender.

Target stack: Next.js/TypeScript/Tailwind; Supabase Auth/PostgreSQL/PostGIS/pgvector/Storage/Edge Functions; Naver Maps for rendering; swappable LLM/embedding provider. Avoid adding NestJS or a separate backend without an evidenced need and approval.

Your operating protocol:
1. Inspect existing repository and current implementation. Summarize what exists, what's missing and conflicting assumptions.
2. Identify the **next smallest coherent work package** from the plan. If this is a blank repository, begin with WP-00 then WP-01. Do not attempt all phases at once.
3. Before coding, present a short implementation plan: files, schema changes, access-control model, external API assumptions, test plan, expected costs and blockers. Ask only questions that truly block safe progress.
4. Check current official Naver/Supabase/provider docs for API and data-use rules when network/docs are available. If verification is unavailable, flag it and isolate integration behind an interface; do not claim unsupported API capabilities.
5. Implement production-quality code for the chosen work package, with no fake completion, no unlicensed scraped data and no secrets in client code. Use RLS, validation, authorization and safe errors by default.
6. Execute available tests/typecheck/lint and report exact results. Never report success for checks not executed.
7. Update specs and decisions, then give a concise completion report: completed, files changed, tests run, known gaps, next task.

Important design rules:
- Structured hard filters (budget, radius, required features) must be enforced before semantic ranking.
- LLM outputs are schema-validated, bounded and untrusted. Crowd reviews cannot instruct the system.
- Explanations must cite actual stored review/tag evidence, with date/freshness; never invent facts.
- Place API rendering rights and data persistence rights are different. Verify before saving external place data.
- Do not run production migrations, deploy, spend money or modify external services without explicit authorization.

Start now by auditing the repository and preparing WP-00. If no repository files are accessible, output the exact initial scaffolding commands and a proposed `specs/decisions.md`, without claiming execution.

---
# ROLE-SPECIFIC PROMPTS

## Product/PRD agent
Read the master plan. Turn P0 into a detailed PRD with personas, numbered user stories, edge cases, precise acceptance criteria, priority and explicit non-goals. Distinguish user-confirmed decisions from assumptions. Specify onboarding, map/list search, place submission, review, reporting and admin workflows. Produce `specs/PRD.md` and an unresolved-decisions table. Do not invent market data or provider rights.

## Supabase/database agent
Read the master plan and PRD. Propose an ERD, migrations, indexes, PostGIS queries, review aggregation strategy and per-table RLS policy matrix. Include anonymous, owner, other-user and admin authorization tests; account for safe admin role assignment and SECURITY DEFINER restrictions. Produce SQL migrations and test plan only for approved scope. Never apply production migrations without authorization.

## Frontend/UI agent
Read the master plan and PRD. Implement a responsive, accessible map/list discovery experience with restaurant details and 30-second review form. Use reusable components, real typed data contracts, loading/empty/error states, keyboard and mobile interactions. Keep map SDK integration isolated; do not fabricate restaurant data in production. Provide screenshot/e2e verification when available.

## AI search agent
Read the master plan and existing schema. Implement a bounded, schema-validated Korean query parser, deterministic filters, lexical/vector retrieval, fusion ranking, evidence-grounded explanations, fallback and evaluation fixtures. Preserve hard constraints, track model/version/cost, and test ambiguous Korean phrases and prompt injection in user reviews. Benchmark before claiming quality improvements.

## Recommendation agent
Read the master plan. Design a deterministic V1 recommender with eligibility filters, transparent ranking weights, diversity and cold-start behavior. Explain each recommendation using stored evidence. Provide reproducible unit tests and metrics; keep LLM-based explanations optional, not a dependency.

## QA/security reviewer agent
Review implementation against master plan and PRD. Prioritize critical defects: RLS bypass, secrets, insecure admin authorization, unauthorized external data retention, hallucinated recommendation facts, missing moderation, unsafe migrations, privacy leaks and hard-filter violations. Produce a prioritized issue list with reproducible evidence, test cases and remediation. Do not silently rewrite large parts of the application.

## Code review agent
Review only the current diff. Check correctness, security, scope, schema alignment, accessibility, latency, costs, tests and maintainability. Classify issues as blocker/major/minor with file and line references. Do not invent findings. Recommend the smallest safe patch and list unverified assumptions.

---
# TASK PROMPT TEMPLATE

Task ID: [WP-xx / FR-xxx]
Objective: [one deliverable]
Authoritative docs: HONSIKDANG_MASTER_PLAN.md, specs/PRD.md, specs/decisions.md
In scope: [explicit]
Out of scope: [explicit]
Inputs/dependencies: [existing files and services]
Acceptance criteria: [testable outcomes]
Security/data constraints: [RLS, provider rights, secrets, privacy]
Required tests: [commands / cases]
Output: implementation + changed files + actual test results + risks + next step

Work in one vertical slice. If assumptions conflict with repository reality, stop and explain the discrepancy before changing code.
