package bank.payments.transfer;

import bank.payments.limits.LimitCheck;
import bank.payments.outbox.Outbox;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Accepts transfers from the online banking: checks the limit, books the
 * transfer once per idempotency key and announces it through the outbox.
 */
@Service
public class TransferService {

    private final TransferRepository transfers;
    private final LimitCheck limits;
    private final Outbox outbox;

    public TransferService(TransferRepository transfers, LimitCheck limits, Outbox outbox) {
        this.transfers = transfers;
        this.limits = limits;
        this.outbox = outbox;
    }

    @Transactional
    public TransferId submit(SubmitTransfer cmd) {
        var existing = transfers.findByIdempotencyKey(cmd.idempotencyKey());
        if (existing.isPresent()) {
            return existing.get().id();
        }
        limits.check(cmd.debtor(), cmd.amount());
        var transfer = Transfer.accept(cmd);
        transfers.save(transfer);
        outbox.publish(new TransferAccepted(transfer.id(), cmd.amount()));
        return transfer.id();
    }

    @Transactional(readOnly = true)
    public TransferStatus status(TransferId id) {
        return transfers.findById(id)
                .map(Transfer::status)
                .orElseThrow(() -> new TransferNotFound(id));
    }
}
