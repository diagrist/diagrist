package bank.payments.outbox;

import org.springframework.stereotype.Component;

@Component
public class Outbox {

    private final OutboxRepository events;
    private final JsonCodec json;

    public Outbox(OutboxRepository events, JsonCodec json) {
        this.events = events;
        this.json = json;
    }

    // #region publish
    /** Writes the event in the same transaction; the relay sends it after the commit. */
    public void publish(DomainEvent event) {
        events.save(new OutboxEntry(
                event.type(),
                event.aggregateId(),
                json.write(event)));
    }
    // #endregion
}
