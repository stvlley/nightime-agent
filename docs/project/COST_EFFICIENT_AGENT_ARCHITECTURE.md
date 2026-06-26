# Nitime — Cost-Efficient Agent Architecture

> Goal: support real provider messaging at low and predictable cost. The default architecture is not a swarm of agents. It is one deterministic message loop with narrow model calls only when deterministic handling cannot produce a safe draft.

## Cost posture

Nitime should optimize for **cost per resolved conversation**, not model quality in isolation.

Current external cost facts to design around as of June 18, 2026:

- OpenRouter's `openrouter/free` router is the current default for optional live drafts; it selects from available free models behind OpenRouter's OpenAI-compatible API.
- OpenAI's GPT-4.1 mini is a viable low-cost paid fallback candidate through OpenRouter; pricing should be checked again before locking production defaults.
- Gemini Flash-Lite is the cheapest paid live-draft candidate found in this pass: Google's Gemini API pricing page lists a Flash-Lite paid tier at **$0.05 / 1M input tokens** and **$0.20 / 1M output tokens**.
- Supabase Edge Functions include **500,000 free monthly invocations** on Free and **2M monthly invocations** on Pro; overage is **$2 / 1M invocations**.
- Supabase bills function invocations regardless of response status, but preflight `OPTIONS` requests are not billed.

Sources:

- https://openrouter.ai/openrouter/free
- https://openrouter.ai/docs/quickstart
- https://openai.com/api/pricing/
- https://ai.google.dev/gemini-api/docs/pricing
- https://supabase.com/docs/guides/functions/pricing
- https://supabase.com/docs/guides/platform/manage-your-usage/edge-function-invocations

## Architecture principle

Use **one channel-agnostic orchestrator**:

```text
channel webhook
  -> normalize inbound
  -> persist message
  -> deterministic screens
  -> deterministic FAQ/template match
  -> optional cheap-model draft
  -> approval queue or deterministic auto-send
  -> cost/quality event log
```

Do not create separate LLM agents for routing, moderation, drafting, memory, and follow-up in the live path. Each extra model call compounds cost, latency, and failure modes. Specialized "agents" can run offline as batch jobs, not per inbound message.

## Live request path

### Tier 0 — free deterministic handling

Run these before any model call:

1. Normalize text, channel, provider, client handle, and thread id.
2. Reject empty/duplicate/replayed webhook payloads.
3. Apply hard safety flags from `agentLogic.ts`.
4. Classify broad intent with keyword rules: booking, pricing, availability, greeting, cancel, reschedule, other.
5. Match FAQ/saved replies by exact phrase, token overlap, and provider-authored aliases.
6. Use provider templates for common outcomes: greeting, hours, pricing request, availability request, handoff, boundary.

Output:

- High-confidence FAQ/template hit -> can auto-send only when provider has opted into `auto_eligible` and moderation is clean.
- Medium/low-confidence hit -> create draft for approval.
- No match -> pass to Tier 1.

### Tier 1 — cheap model draft, approval-only

Call one small model once. Candidate defaults:

- `openrouter/free` through OpenRouter for cost-first beta
- GPT-4.1 mini through OpenRouter when a paid fallback is needed
- Gemini Flash/Flash-Lite through OpenRouter or direct provider if quality/cost tests justify it

Rules:

- `max_tokens`: target 120-180 for normal replies; 320 should be a hard upper bound, not the default.
- Prompt includes only compact provider context, relevant FAQ snippets, and the latest inbound message.
- The model drafts only. It never confirms booking, invents price/availability, or auto-sends.
- One retry maximum, and only for transport/API errors. No self-critique loop in production.
- If model is disabled, capped, or errors, use the deterministic holding reply and queue for approval.

### Tier 2 — human escalation

Do not spend more model tokens when the right answer is "provider must decide."

Escalate when:

- content is flagged,
- client asks for something not in provider rules,
- booking/price/availability requires a firm commitment,
- thread has exceeded its daily model-call cap,
- model confidence or output validation fails,
- the same client loops without resolution.

## Offline/batch path

Use batch jobs for work that improves future free handling:

- Mine approved provider replies into suggested FAQ entries.
- Detect repeated unanswered questions.
- Summarize weekly unresolved threads.
- Propose provider-specific templates.
- Generate cost reports by provider/channel.

These jobs can use discounted batch processing or be run manually before scale. They should not sit in the live response path.

Use the cheapest acceptable model for this lane. Examples: GPT-4.1 nano, Gemini Flash-Lite/low-cost Flash tier, or another cheap summarizer behind the same provider abstraction. Summaries do not need the live draft model unless quality tests prove they do.

## Prompt and context design

Keep prompt input small and cacheable.

Split prompt context into:

- **Static system policy:** Nitime assistant rules, marketplace boundary, never-invent constraints.
- **Provider profile block:** business name, tone, boundaries, approval mode.
- **Relevant knowledge block:** only top 3-5 FAQ/template matches, not the full FAQ table.
- **Conversation block:** latest inbound plus optionally the last 2 short turns.

Implementation target:

```text
system policy           cacheable
provider profile        cacheable until settings change
top FAQ snippets        dynamic, small
latest message          dynamic
```

Add prompt caching only after the prompt is stable and token accounting is logged.

## Cost controls

Add hard controls before broad launch:

- Per-provider monthly included model-call quota.
- Per-provider daily model-call cap.
- Per-thread rolling cap, for example 3 model calls per 24h.
- Per-client debounce window for rapid messages.
- Message hash dedupe for repeated webhook deliveries.
- Channel-level kill switch.
- Global emergency `AGENT_LLM_DISABLED=true` fallback.
- Plan-based usage limits tied to `profiles.usage_limit`.

Behavior when capped:

- FAQ/template hits still work.
- Model misses become deterministic holding drafts.
- Provider sees "cap reached" in the approval queue and billing screen.

## Observability and cost ledger

The current `agent_events` table is the right base. Extend it or add a dedicated ledger so cost is visible per provider.

Minimum fields:

- `user_id`
- `thread_id`
- `message_id`
- `channel`
- `event_kind`
- `model`
- `input_tokens`
- `output_tokens`
- `cached_input_tokens`
- `estimated_cost_cents`
- `source` (`faq`, `template`, `llm`, `fallback`)
- `auto_sent`
- `approval_status`
- `created_at`

Monthly provider dashboard:

- total inbound messages,
- FAQ/template hit rate,
- model calls,
- estimated model cost,
- channel delivery cost if known,
- approval rate,
- auto-send rate,
- cap events.

## Data changes to queue

Prefer small migrations:

1. `agent_usage_events`
   - append-only cost and routing ledger.
2. `provider_agent_budgets`
   - monthly/daily/thread caps and whether LLM is enabled.
3. `provider_response_templates`
   - provider-authored templates separate from FAQ.
4. `faq_aliases` or alias JSON on `faq`
   - improves deterministic matching without model calls.

Do not add vector retrieval until FAQ/template matching stops being enough. For this product, careful provider-authored rules are cheaper and more controllable than retrieval for v1.

## Model routing

Initial production recommendation:

```text
FAQ/template hit          -> no model
Normal miss               -> no model for TestFlight; OpenRouter `openrouter/free` when enabled; paid OpenRouter model only after quality/cost bakeoff
Flagged/sensitive miss    -> no model, human approval
Repeated unresolved loop  -> no model live; batch review later
Weekly FAQ mining         -> batch/offline cheapest acceptable summarizer
High-risk/operator review -> GPT-5.5, manually triggered only
```

Do not add a separate live "tool-calling model" for v1. The tools are known and narrow: read provider preferences, read FAQ/templates, persist messages, create drafts, and send approved drafts. Code should own those side effects. A model may draft structured JSON for a reply, but it should not choose arbitrary tools in the live path.

Low confidence is not enough to justify GPT-5.5 in the live customer path. Low confidence should normally mean provider approval or deterministic holding reply. GPT-5.5 is reserved for explicit high-risk/operator review, policy/compliance review, roadmap/design work, or offline analysis where the added cost is intentional.

Keep the provider abstraction small:

```ts
interface DraftModel {
  draftReply(input: DraftInput): Promise<DraftResult>;
}
```

That allows a later paid OpenRouter/local model swap without changing the message loop.

Suggested abstraction:

```ts
type ModelLane = 'live_draft' | 'offline_summary' | 'high_risk_review';

interface ModelRouter {
  draftReply(input: DraftInput, lane: ModelLane): Promise<DraftResult>;
}
```

## Implementation order

1. Keep `AGENT_LLM_DISABLED=true` for TestFlight until the deterministic flow is validated.
2. Add usage/cost ledger around existing `runAgentTurn()`.
3. Add a model-router config with lanes for `live_draft`, `offline_summary`, and `high_risk_review`.
4. Set `live_draft` to OpenRouter `openrouter/free`; switch to a paid OpenRouter model only after a small provider bakeoff proves quality is acceptable.
5. Keep default `AGENT_LLM_MAX_TOKENS=180`; 320 is the hard ceiling, not the default.
6. Add daily/monthly/thread caps.
7. Add provider templates and improve FAQ aliases.
8. Add dashboard usage/cost cards.
9. Add prompt caching once token accounting proves the static prompt is stable.
10. Add offline FAQ-mining batch job from approved replies.

## Success metric

For v1, target:

- 70%+ inbound messages handled without a model call.
- 100% model-drafted messages require provider approval.
- LLM cost visible per provider before the first paid launch.
- No provider can exceed their plan's model budget silently.
