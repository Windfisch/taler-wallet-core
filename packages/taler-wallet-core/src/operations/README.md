# Wallet Operations

This folder contains the implementations for all wallet operations that operate on the wallet state.

To avoid cyclic dependencies, these files must **not** reference each other. Instead, other operations should only be accessed via injected dependencies.

Avoiding cyclic dependencies is important for module bundlers.

## Retries

Many operations in the wallet are automatically retried when they fail or when the wallet
is still waiting for some external condition (such as a wire transfer to the exchange).

Retries are generally controlled by a "retryInfo" field in the corresponding database record. This field is set to undefined when no retry should be scheduled.

Generally, the code to process a pending operation should first increment the
retryInfo (and reset the lastError) and then process the operation. This way,
it is impossble to forget incrementing the retryInfo.

For each retriable operation, there are usually `setup<Op>Retry`, `increment<Op>Retry` and
`report<Op>Error` operations.

Note that this means that _during_ some operation, lastError will be cleared. The UI
should accommodate for this.

It would be possible to store a list of last errors, but we currently don't do that.
