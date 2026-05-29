---
name: backend-idempotency
description: Use when designing, implementing, or reviewing backend idempotency for APIs, jobs, message consumers, retries, external side effects, payment flows, checkout systems, inventory updates, email sends, webhooks, and database writes. Apply this when adding retry safety, preventing duplicate operations, handling partial failures, defining idempotency keys, storing operation results, or reviewing distributed-system code for duplicate charge, duplicate order, duplicate notification, or duplicate mutation risks.
---

Apply this skill when the task matches the description above. Follow the workflow, design rules, and output expectations below. Use the reference file when you need concrete storage schemas, lifecycle states, key design examples, concurrency patterns, or tests.

# Backend Idempotency

Use this skill when a backend operation may be retried, replayed, delivered more than once, or resumed after a partial failure.

Retries are only safe when the operation they repeat is idempotent. Treat every external side effect as unsafe until there is a durable duplicate-detection boundary in front of it.

Read [../references/idempotency-patterns.md](../references/idempotency-patterns.md) when you need concrete storage schemas, lifecycle states, key design examples, concurrency patterns, or tests.

## Workflow

1. Identify the operation being protected and its externally visible side effects.
2. Map every retry and replay source: HTTP clients, SDK retries, job queues, message brokers, webhook retries, scheduled jobs, database timeouts, and manual replays.
3. Define the idempotency boundary before the first side effect that must not run twice.
4. Choose a stable idempotency key that represents one business operation, not one transport attempt.
5. Validate the incoming request against any previous request recorded for the same key.
6. Store the key, request fingerprint, operation name, status, result, timestamps, and expiration in durable storage.
7. Enforce concurrency with a unique constraint, compare-and-set insert, advisory lock, or transactional outbox pattern supported by the local stack.
8. Return the cached result for completed duplicate attempts.
9. Handle in-progress duplicates explicitly with either wait-and-return, `409 Conflict`, or `202 Accepted`, depending on the API contract.
10. Add tests for duplicate submissions, concurrent submissions, partial failure after the side effect, and expiration behavior.

## Design Rules

- Put the idempotency check before charging, sending, publishing, decrementing stock, creating a remote resource, or emitting an irreversible event.
- Use a unique operation key supplied by the caller when the client needs retry control, such as an `Idempotency-Key` header.
- Use a deterministic server-generated key only when the server has enough stable business identifiers to identify the same operation without collapsing legitimate repeat operations.
- Store a request fingerprint with the key and reject reuse of the same key with different meaningful inputs.
- Cache the full response shape needed to make a retry indistinguishable from the original success.
- Make duplicate detection atomic. A separate read-then-write check is a race condition.
- Keep idempotency records long enough to cover real retry windows, queue redelivery windows, and user retry behavior.
- Expire old records deliberately so the table does not grow forever.
- Treat idempotency as a cross-cutting API and integration concern, not as one-off payment logic.

## Key Selection

Prefer keys that encode the business operation boundary:

```text
checkout:<customer-id>:<cart-version>:<checkout-attempt-id>
payment:<order-id>:authorize:<attempt-id>
email:<order-id>:confirmation
inventory:<order-id>:reserve
webhook:<event-id>:<subscriber-id>
```

Avoid keys that are:

- Randomly regenerated on each retry
- Too broad, such as only `customer_id`
- Too narrow, such as a per-attempt UUID created inside the retried function
- Based on mutable values that change between attempts
- Reused across different operations, such as using one order key for charge, inventory, and email

## Implementation Shape

Use a durable record with an atomic claim step:

```sql
CREATE TABLE idempotency_keys (
  key TEXT PRIMARY KEY,
  operation TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  status TEXT NOT NULL,
  response_body JSONB,
  error_body JSONB,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);
```

Typical statuses:

- `IN_PROGRESS`: one worker owns the operation
- `COMPLETED`: return the cached success response
- `FAILED_RETRYABLE`: allow a controlled retry or takeover after a lock timeout
- `FAILED_FINAL`: return the cached terminal failure when repeating it is correct

## Pitfalls

- Adding retries without an idempotency boundary
- Calling an external API before recording the idempotency key
- Using database transactions to protect remote side effects they cannot roll back
- Checking for an existing key and then inserting later without a unique constraint
- Using the same key for different request bodies
- Caching only success while letting retryable failures trigger duplicate side effects
- Forgetting async consumers, webhook handlers, emails, and inventory updates
- Treating HTTP method names as sufficient idempotency guarantees

## Output Expectations

When finishing a task that uses this skill, state:

- Which operations were made idempotent
- Where the idempotency boundary is enforced
- How keys are generated or accepted
- How concurrent duplicate attempts behave
- What result is returned for completed, in-progress, and mismatched duplicates
- Which tests prove retry, replay, and partial-failure safety
