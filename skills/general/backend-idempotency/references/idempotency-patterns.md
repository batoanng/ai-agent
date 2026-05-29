# Idempotency Patterns

Use this reference when implementing backend idempotency in API handlers, background jobs, message consumers, payment flows, checkout systems, email sends, inventory updates, or webhook delivery.

## Core Model

An idempotent operation needs four things:

1. A key that identifies one business operation
2. A durable record for that key
3. Atomic ownership of the first execution
4. A cached terminal result for later attempts

Without atomic ownership, duplicate callers can both observe "missing" and both perform the side effect.

## HTTP API Pattern

For client-retryable mutation APIs, prefer an explicit `Idempotency-Key` header.

Server behavior:

1. Require the key for high-risk mutation endpoints.
2. Normalize the meaningful request body and compute a request hash.
3. Insert a row with `key`, `operation`, `request_hash`, and `IN_PROGRESS`.
4. If insert succeeds, execute the operation and persist the final response before returning.
5. If insert conflicts, load the existing row.
6. If the request hash differs, return `409 Conflict` or `422 Unprocessable Entity`.
7. If the row is `COMPLETED`, return the stored response with the original status code.
8. If the row is `IN_PROGRESS`, return the contractually chosen response: wait briefly, return `409 Conflict`, or return `202 Accepted`.

## Message Consumer Pattern

Use message identity plus subscriber identity:

```text
consumer:<consumer-name>:message:<message-id>
webhook:<provider-event-id>:handler:<handler-name>
```

For brokers with at-least-once delivery, store processed message IDs in the same database transaction as local state changes. For external side effects, record the idempotency key before the side effect and use provider-supported idempotency keys when available.

## Outbox Pattern

Use an outbox when local database state and external publication must stay coordinated:

1. Write the business state and an outbox row in one database transaction.
2. Give the outbox row a stable event ID.
3. A publisher reads unpublished rows and sends them.
4. The recipient uses the event ID as an idempotency key.
5. The publisher marks the row published only after the send succeeds.

The outbox prevents "database committed but message not sent" gaps. Recipient idempotency prevents duplicate delivery from repeated publishing.

## Payment And Checkout Pattern

Separate operation keys by side effect:

```text
order:create:<checkout-attempt-id>
payment:authorize:<checkout-attempt-id>
inventory:reserve:<order-id>
email:confirmation:<order-id>
```

Do not use one shared key for every step. A duplicate email and a duplicate charge have different replay semantics and different cached results.

When the payment provider supports idempotency keys, pass the internal key through to the provider. Also store the provider transaction ID locally before moving the operation to `COMPLETED`.

## Request Fingerprint

Hash only meaningful operation inputs. Exclude volatile transport fields such as tracing IDs, timestamps added by middleware, signatures, and header ordering.

Include fields that must not change under the same key:

- actor or tenant ID
- target resource ID
- amount and currency
- operation type
- cart or version identifier
- recipient or destination

If the same key appears with a different fingerprint, reject it. Returning the original result for different inputs hides client bugs.

## Concurrency Options

Use the strongest primitive already natural for the stack:

- SQL unique constraint with `INSERT ... ON CONFLICT`
- SQL transaction plus `SELECT ... FOR UPDATE`
- database advisory lock around the idempotency row
- Redis `SET key value NX PX` only when losing the key on Redis failure is acceptable or backed by a durable record
- provider-native idempotency key plus local durable record

Do not rely on in-memory locks in multi-instance services.

## Failure Semantics

Classify failures deliberately:

- Failure before the side effect: delete or mark retryable so a later attempt can run.
- Failure after the side effect but before local completion: recover by querying the external system using the provider idempotency key or transaction reference.
- Terminal validation failure: cache the failure if repeating the same invalid request should produce the same response.
- Transient dependency failure: store enough state to prevent duplicate side effects before retrying.

An `IN_PROGRESS` row should have a lease or timeout so a crashed worker does not block the key forever.

## Expiration

Set `expires_at` by real replay risk:

- payment and checkout operations: at least the provider retry and customer retry window
- webhooks and queue messages: at least the broker redelivery horizon
- low-risk form submissions: often 24 hours is enough
- audit-sensitive financial operations: follow compliance and reconciliation requirements

Deletion should be a scheduled cleanup job using an indexed `expires_at` column.

## Tests To Add

Add focused tests for:

- identical retry returns the cached result and does not repeat the side effect
- same key with different request body is rejected
- two concurrent attempts perform the side effect once
- timeout after external success does not create a second external operation
- `IN_PROGRESS` duplicates follow the documented API behavior
- expired keys are removed or no longer block a new operation according to the contract
- message redelivery does not repeat local mutation or external publication
