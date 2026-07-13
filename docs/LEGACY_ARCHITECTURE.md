# Legacy Calorify Architecture

Inspected: 2026-07-13

Source on the current owner workstation: C:\B Drive\Apps\Calorify AI (local context, not a portable repository requirement)

Disposition: read-only reference, not a mobile backend dependency

## System map

    React 18 + Vite + React Router + Tailwind + Recharts
                         |
                    Axios /api
                         |
                  Express on port 3001
                  /       |        \
             Prisma    Ollama     Provider logic
                |      chat/embed
        PostgreSQL + pgvector

The browser application owns presentation and some meal calculation state. Express owns routes and orchestration. Prisma persists foods, meals, meal items, goals, and settings. Ollama supplies both text extraction and embeddings. PostgreSQL pgvector performs semantic food lookup.

## User-facing capabilities

- Dashboard with daily totals, goal progress, seven-day summaries, and recent meals.
- Quick Log natural-language meal entry and review.
- Manual/custom-food logging.
- Paginated history with delete.
- Nutrition goals.
- Advanced charts.
- Settings for Ollama URL, chat model, embedding model, similarity threshold, and model pull.

## API surface

| Method | Route | Observed responsibility |
|---|---|---|
| POST | /api/analyze | Parse food mentions, embed each name, retrieve top food, calculate nutrition |
| POST | /api/meals | Persist client-provided meal/item values |
| POST | /api/meals/custom | Resolve custom-food conflict, update/create food, attempt embedding, create meal |
| GET | /api/meals | Paginated meal history |
| DELETE | /api/meals/:id | Delete a meal |
| GET | /api/dashboard | Current-day totals, goals, seven-day values, recent meals |
| GET | /api/goals | Read goals |
| PUT | /api/goals | Replace goals |
| GET | /api/settings | Read runtime settings |
| PATCH | /api/settings | Update runtime settings |
| GET | /api/settings/models | List Ollama models and heuristically classify chat/embedding |
| POST | /api/settings/models/pull | Stream Ollama model-pull progress with server-sent events |

## Analysis and save flow

1. The analyze route loads the active settings row.
2. The Ollama chat model receives a prompt constrained to foods with name, quantity, and unit.
3. Zod validates the JSON result; a malformed result is retried once.
4. Each food name is embedded.
5. pgvector selects one nearest Food row above the configured cosine-similarity threshold.
6. Nutrition is scaled by quantity/serving logic and returned to the client.
7. The client reviews the result and posts meal items and totals to the meal route.
8. Prisma creates the meal and nested items.

The good architectural rule is that the LLM is intended to extract food mentions rather than nutrition. Mobile keeps and strengthens that rule.

## Implemented service responsibilities

| Legacy component | Observed behavior | Porting disposition |
|---|---|---|
| OllamaProvider | Calls configured Ollama chat/embedding endpoints, requests JSON, disables thinking, applies a 120-second timeout, supports current/legacy embedding endpoints | Replace with a cancelable on-device inference adapter; retain provider fakes as a testing idea |
| Meal parser/service | Builds the constrained extraction prompt, validates with Zod, retries malformed output once | Reimplement the narrow schema/validation in pure TypeScript plus llama.rn grammar |
| EmbeddingService | Embeds each parsed name and requests pgvector nearest food | Replace with exact/alias/FTS resolver; vector adapter only after evaluation |
| NutritionCalculationService | Scales database macros by serving/quantity logic | Reimplement with dimensional units, food portions, immutable revisions, and decimal tests |
| Prisma client/repositories in routes | Reads settings/goals/foods and writes meals/custom foods | Replace with typed expo-sqlite repositories and application use cases |
| Vite API client | Axios wrapper for Express routes | Replace with direct local use cases; future online client talks only to controlled lookup backend |

The extraction prompt directs the model to identify foods and return JSON containing name, quantity, and unit, including defaults/normalization guidance. It does not ask for nutrition. The mobile prompt should keep this narrow intent while using grammar/schema enforcement, bounded context/output, adversarial tests, and no reliance on a prompt retry to establish authority.

## Persistence model

| Legacy entity | Purpose | Mobile implication |
|---|---|---|
| Food | Current name, aliases, serving basis, macros, vector | Separate identity, immutable nutrition revisions, aliases, portions, and provenance |
| MealLog | Meal type, totals, timestamp | Recompute totals on save; retain local-day/time semantics |
| MealItem | Food reference, quantity/unit, macro snapshots | Snapshot identity, resolved basis, all nutrients, resolution method, and provenance |
| Goal | Daily calorie and macro targets | Versioned local settings with validation |
| Settings | Ollama connection/models/threshold | Local app/model preferences; never arbitrary remote daemon control |

## Seed and import observations

- foods.csv contains 1,776 valid unique food records after seven leading comment lines.
- Unit distribution is predominantly grams, with a smaller number of piece, millilitre, tablespoon, and slice records.
- The TypeScript importer uses a header-based CSV parser but does not explicitly skip the leading comments, so the current file/importer pair is not a trustworthy reproducible pipeline.
- The Python collection script merges Open Food Facts and Indian food-composition material, then strips its internal source marker before writing the CSV.
- Row-level provider identity, source version, license, retrieval time, and transformation lineage are therefore not preserved.
- Repository documents disagree on whether the seed contains 95 foods, is still pending expansion, or is complete.

The mobile project must not copy this file into a distributable build. The official IFCT publication asserts copyright and restricts electronic reproduction for product creation without prior written permission. Because the merged CSV lost row provenance, unknown rows cannot safely be separated by assumption. Phase 4 requires a clean, reproducible, rights-audited source pipeline.

## Test coverage observed

The repository contains 24 route/service-oriented tests:

- Analyze: 6
- Custom food: 5
- Goals: 3
- Meals/dashboard: 10

They use fakes and provide useful behavioral examples, but do not validate:

- Prisma against PostgreSQL or pgvector.
- Migration and import behavior.
- A live Ollama parse or embedding.
- Model listing/pulling and streamed failures.
- Browser-to-database end-to-end behavior.
- Concurrency and partial transaction failures.

Several documents still report 16 tests, which is documentation drift rather than evidence.

## Correctness and safety gaps to avoid

### Client-authoritative meal nutrition

POST /api/meals accepts foodId, per-item nutrition, and meal totals from the client. It does not reload authoritative food data and recompute values. A caller can create internally inconsistent or fabricated records.

Mobile rule: a save command contains user intent and confirmed selections; the domain use case reads authoritative revisions, converts units, recomputes item snapshots/totals, and writes them transactionally.

### Incomplete custom-food transaction

Custom food update/create, embedding, and meal creation are separate operations. A failed meal write can leave a changed food behind.

Mobile rule: meal persistence is an exclusive SQLite transaction. Optional indexing is derived/rebuildable and must not control the authoritative commit.

### Mutable history identity

Meal items snapshot calories and macros, but display can still join the current Food name and serving basis. Editing a Food changes the apparent historical identity.

Mobile rule: meal items retain immutable name, input/resolved quantities and units, nutrition, source, and user-edit snapshots. Food links are optional navigation aids, not history truth.

### Retrieval ambiguity

The implementation performs vector top-1 retrieval only. Stored aliases are unused and embeddings represent names only. A similarity threshold does not make an ambiguous top result correct.

Mobile rule: normalized exact, alias, FTS candidate ranking, explicit ambiguity review, then optional vector retrieval only if measured to improve a golden corpus.

### Unsafe unit fallback

Some mismatched units are scaled as if quantity alone were a valid factor. That can treat a piece, gram, or tablespoon as interchangeable.

Mobile rule: mass, volume, and count are distinct dimensions. Cross-dimension conversion needs a food-specific portion with a known gram/millilitre equivalent.

### Unverified model management

Ollama owns model storage and pulling. The app accepts arbitrary names and does not own an immutable manifest, resumable transfer state, final downloaded-file checksum, GGUF compatibility validation, or atomic activation.

Mobile rule: app-private storage, allowlisted manifest, durable resume state, streaming SHA-256, format/architecture checks, staged activation, and last-known-good rollback.

### Privacy and configuration drift

- The web client loads Google-hosted fonts despite local-only privacy language.
- Docker exposes PostgreSQL on host port 5433 while examples use localhost port 5432.
- DAILY_CALORIE_GOAL is parsed but dashboard logic uses the Goal row/default.
- README pagination and error details do not match routes.
- PLAN and PROGRESS disagree about implemented features and test state.
- A claimed client timeout of 60 seconds differs from the observed 120 seconds.

Mobile rule: executable checks, current handoff evidence, local assets, and release-time privacy/network inspection take precedence over narrative claims.

## What to reuse conceptually

- Natural-language input followed by a structured review step.
- LLM extraction limited to names, quantities, and units.
- Database-backed nutrition rather than generated nutrition.
- Daily goals, dashboard, history, custom foods, and settings as the core product vocabulary.
- Retry and validation around structured model output.

## What not to port

- Express, PostgreSQL, Prisma, pgvector, or Ollama as a required local service.
- Browser-oriented layout/components.
- Client-authoritative totals.
- Vector-only top-1 retrieval.
- Arbitrary unit fallback.
- Merged seed data without provenance.
- Remote-font or daemon dependencies.
- Server-side model pull semantics.
- Legacy documentation claims that are not confirmed by implementation or tests.
