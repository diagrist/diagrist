package bank.payments.outbox;

import org.springframework.stereotype.Component;

@Component
public class Outbox {

    private final OutboxRepository entries;
    private final JsonCodec json;

    public Outbox(OutboxRepository entries, JsonCodec json) {
        this.entries = entries;
        this.json = json;
    }

    // #region publish
    /** Stores the event in the caller's transaction; the relay sends it after the commit. */
    public void publish(DomainEvent event) {
        entries.save(new OutboxEntry(
                event.type(),
                event.aggregateId(),
                json.write(event)));
    }
    // #endregion
}
