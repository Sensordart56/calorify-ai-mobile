# Controlled Online Nutrition Fallback

Status: future optional capability; not part of the first offline release

Principle: an online failure never blocks local/manual logging

## Product contract

Online lookup is offered only when local exact/alias/FTS resolution and user review cannot find a suitable food. It requires an explicit user action. The UI shows what will be sent and always offers Manual entry.

Allowed request scope:

- The minimum unresolved food query.
- Optional locale/country and result category needed to improve relevance.
- A backend contract/app version.

Not sent:

- Full meal text or other resolved foods.
- Meal history, goals, weight, health profile, contacts, advertising ID, or installed model.
- Raw local database records.
- A provider API key.

The initial offline release must not contain a dormant direct-provider client that encourages embedding secrets or bypasses disclosure.

## Architecture

    Mobile review
        |
    explicit lookup
        |
    controlled Calorify backend
       /          \
    USDA FDC    Open Food Facts
       \          /
     validated normalized candidates
        |
    mobile comparison and provenance
        |
    accept / edit / reject
        |
    immutable local food revision

The backend is an adapter and policy boundary, not the system of record for user meals.

## Why a backend is required

- USDA FoodData Central requires an API key and warns against making keys public; a mobile binary cannot keep one secret.
- Provider quotas and rate limits need shared caching, throttling, and operational control.
- Provider schemas and licensing/provenance mapping can change independently of the mobile release.
- The backend can enforce fixed upstream hosts, timeouts, payload limits, validation, and cost budgets.
- A remotely disableable online feature protects the fully local app from provider outages or contract changes.

The backend does not make unreviewed remote data authoritative. User acceptance does.

## Provider order

### USDA FoodData Central

Best initial structured source for generic and branded foods where coverage is appropriate.

Contract considerations:

- Keep the API key only in backend secret storage.
- Default published limit is 1,000 requests per hour per IP; verify current quota before deployment.
- Preserve the FoodData Central ID, food data type, description, serving basis, nutrient identities, data version/update time where supplied, source URL, and retrieval time.
- USDA states its data are public domain/CC0 and requests attribution; confirm exact release notices at launch.
- Normalize nutrients by stable nutrient IDs rather than display strings.

Official reference: https://fdc.nal.usda.gov/api-guide/

### Open Food Facts

Useful for barcode/branded products and international coverage, but volunteer-contributed data can be incomplete or inaccurate.

Contract considerations:

- Prefer the documented v3 API where it supports the use case; v2 is deprecated.
- Do not implement search-as-you-type. Published search limits are much lower than product reads and must be checked at deployment.
- Identify the application with the required User-Agent/contact convention.
- Preserve barcode/product ID, selected fields, last modification/version evidence, source URL, retrieval time, and completeness/warning flags.
- Database content is governed by ODbL/DbCL terms and images by CC BY-SA; do not repeat the legacy blanket “open/CC BY-SA” claim.
- Image use creates additional attribution/share-alike work; omit images initially unless separately approved.

Official references:

- https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/
- https://openfoodfacts.github.io/documentation/docs/tutorials/license-be-on-the-legal-side/

### Excluded initially

- Website scraping or HTML parsing.
- Search-engine results as nutrition authority.
- Unlicensed/community data without stable provenance.
- IFCT-derived distribution without written permission or a reviewed lawful basis.
- An online LLM generating nutrition.

## Backend request contract

Proposed versioned request:

| Field | Rule |
|---|---|
| query | Trimmed unresolved food name, bounded length |
| locale | Optional validated locale |
| country | Optional ISO country |
| barcode | Optional validated barcode; mutually clear with text search policy |
| provider preference | Optional allowlisted value |
| contract version | Required |

No arbitrary URL, provider host, GraphQL fragment, SQL, HTML, prompt, or field list is accepted from the client.

Authentication/abuse options to decide:

- Anonymous App Check/integrity signal plus backend rate limit.
- Rotating installation-scoped opaque token with no user identity.
- Account authentication only if future sync/account scope genuinely requires it.

Do not introduce login solely to protect a low-risk lookup endpoint before evaluating privacy and friction. Rate limit by a combination of coarse network, installation token, integrity signal, and budget; document retention.

## Backend response contract

Every candidate is schema validated and contains:

- Provider and stable provider record ID.
- Candidate name/brand/description.
- Canonical nutrient basis: per 100 g, per 100 ml, or explicit serving/count.
- Calories, protein, carbohydrate, and fat with clear missing versus zero.
- Serving/portion values and units where supplied.
- Source dataset/version/update evidence.
- License ID and required attribution.
- Canonical source URL.
- Retrieval time.
- Warnings: missing nutrients, estimated/derived provider values, ambiguous basis, volunteer data, stale/incomplete record.
- Normalized payload hash and backend contract version.

The mobile decoder rejects negative/impossible/non-finite nutrients, unknown bases, oversized strings/payloads, invalid URLs/IDs, and unsupported contract versions. Rejection returns the user to manual entry.

## Normalization rules

- Use stable provider nutrient IDs and units.
- Convert kilojoules to kilocalories only through one tested domain conversion while retaining original evidence.
- Preserve original sourced values separately from normalized/calculated values.
- Never interpret a missing nutrient as zero.
- Do not synthesize a per-serving basis when serving weight is absent.
- Do not cross-convert volume and mass without an explicit density/portion supplied by that record and accepted by product policy.
- Flag provider duplicate/ambiguous candidates rather than merging them silently.
- Define and version rounding so provider updates can be explained.

## User review and local authority

The candidate screen shows:

- Food/product identity.
- Serving/basis and four core nutrients.
- Provider, source link, last-updated/retrieved evidence, and relevant accuracy warning.
- Any missing values.

Actions:

- Accept: create a local FoodSource and immutable FoodRevision.
- Edit and accept: preserve original source values/hash and create a user-modified revision.
- Reject: save nothing authoritative; optionally suppress the candidate locally for the request.
- Manual: create an explicit manual revision.

Previously accepted nutrition remains usable offline. A later provider refresh never overwrites an accepted revision or history; it offers a new revision for review.

## Cache policy

Two distinct stores:

1. Backend/provider cache for quota, cost, and outage protection.
2. Optional local transient query cache for repeated review.

Rules:

- Cache keys include provider, normalized query/barcode, locale/country, and contract version.
- Positive and negative results have documented, provider-appropriate TTLs.
- Stale-while-revalidate may improve backend availability but stale age is disclosed in metadata.
- A local transient cache is never nutrition authority.
- Accepted results become durable local revisions with provenance and do not expire.
- Provider deletion/correction policy can mark a source deprecated without mutating meal snapshots.

## Security controls

Backend:

- Secrets only in a managed secret store; rotate and scan.
- Fixed upstream HTTPS host allowlist and DNS/redirect policy.
- No arbitrary proxying, URL fetching, scraping, or user-provided headers.
- Strict request/response schemas, body limits, timeouts, cancellation, bounded retries with jitter, and circuit breakers.
- Per-provider concurrency/rate/budget caps and a global emergency disable.
- Dependency and container/runtime patch policy.
- Minimal structured logs with query redaction/hash strategy decided by privacy review.
- Do not log meal history, raw full meals, tokens, or upstream keys.
- Provider fixture/contract monitoring catches schema drift without using user data.

Mobile:

- Certificate/platform TLS validation; certificate pinning only if the team can safely operate rotation/recovery.
- Contract version and bounded payload decoding.
- No embedded secret or “hidden” production key.
- Clear offline/timeout/quota/invalid-response errors.
- Cancel the request when the screen closes.
- Never execute or render provider HTML.

Prompt injection is not relevant to the initial structured provider adapters because no web content is sent to an LLM. If a later design feeds provider text to a model, treat it as untrusted data and conduct a new threat review.

## Resilience and cost

- Short connection/read deadlines suitable for an optional action.
- Retry only idempotent lookups and transient errors; no retry storms.
- Circuit breaker returns a stable unavailable response quickly.
- Backend caching and provider-specific concurrency protect quotas.
- Daily/monthly cost budget with alerts and an automatic safe disable.
- Status/incident runbook owned by a named operator.
- Mobile feature flag/catalog response may hide online lookup, but manual/offline paths never depend on fetching that flag.

## Privacy and policy work

Before enabling:

- Update in-app privacy disclosure and public privacy policy.
- Re-answer Play Data Safety from observed traffic and SDK behavior.
- Update the Health apps declaration and data-source disclosures.
- Identify backend processor/subprocessor, hosting region, retention, deletion, incident contact, and legal basis/consent.
- Review USDA and Open Food Facts current terms/rates/attribution.
- Decide whether query logs are necessary; default to not retaining raw queries.
- Provide a user-visible way to delete accepted foods and any installation token.

## Test and launch gate

Tests:

- Versioned request/response schemas.
- Recorded USDA/OFF fixtures including missing and zero nutrients.
- Provider schema changes, invalid values, oversized payload, slow response, timeout, 429, 5xx, DNS/TLS failure.
- Cache hit/miss/stale/negative/contract-version behavior.
- Secret scanning and upstream-host allowlist.
- Abuse/rate/budget cutoff.
- User accept/edit/reject and source-value preservation.
- Airplane mode and mid-request loss returning to Manual.
- Backend fully disabled while all local flows pass.

Launch gate:

- Named operational and privacy owners.
- Approved provider terms and attribution.
- Data Safety/Health/privacy documents match a captured network audit.
- Cost/rate limits tested.
- No direct mobile provider secret.
- No online dependency in startup, history, manual logging, seed lookup, or meal save.
