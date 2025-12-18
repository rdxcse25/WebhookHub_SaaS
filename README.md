# WebhookHub

## 🔁 Stripe Webhook Processing Flow

This diagram shows how WebhookHub reliably ingests and processes Stripe webhooks
before delivering them to the client backend (e.g. Stashfin).

```mermaid
sequenceDiagram
    participant Stripe
    participant WebhookHub_API as WebhookHub Ingestion API
    participant DB as PostgreSQL
    participant Kafka
    participant Worker
    participant Stashfin as Stashfin Backend

    Stripe->>WebhookHub_API: POST /webhooks/stripe/stashfin
    WebhookHub_API->>WebhookHub_API: Verify Stripe Signature
    WebhookHub_API->>WebhookHub_API: Validate Schema
    WebhookHub_API->>DB: Insert raw event (events_raw)
    WebhookHub_API->>Kafka: Publish event (events_ingested)
    WebhookHub_API-->>Stripe: 200 OK

    Kafka->>Worker: Consume event
    Worker->>DB: Check idempotency (events_state)
    Worker->>DB: Update status = PROCESSING
    Worker->>Stashfin: POST /internal/stripe/webhooks
    Stashfin-->>Worker: 200 OK
    Worker->>DB: Update status = SUCCESS
