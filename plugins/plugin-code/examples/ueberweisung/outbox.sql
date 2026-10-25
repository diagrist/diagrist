-- Outbox: one row per event, written in the business transaction.
-- #region table
CREATE TABLE outbox_entry (
    id           BIGSERIAL PRIMARY KEY,
    type         VARCHAR(80)  NOT NULL,
    aggregate_id UUID         NOT NULL,
    payload      JSONB        NOT NULL,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    sent_at      TIMESTAMPTZ
);
-- #endregion

-- The relay reads what is not sent yet, oldest first.
CREATE INDEX outbox_unsent ON outbox_entry (created_at) WHERE sent_at IS NULL;
