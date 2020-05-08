#!/bin/bash
# Script to check that the wallet can handle refund URIs and actually process the refund

source "common.sh"
normal_start_and_wait "refund"

echo "Withdraw TESTKUDOS"
taler-wallet-cli --wallet-db="$WALLET_DB" --no-throttle testing withdraw -e "$EXCHANGE_URL" -b "$BANK_URL" -a "TESTKUDOS:10" >>"$LOG" 2>>"$LOG"
echo -n "Balance after withdrawal: "
taler-wallet-cli --wallet-db="$WALLET_DB" balance 2>>"$LOG"
REFUND_URI=$(taler-wallet-cli --wallet-db="$WALLET_DB" --no-throttle testing gen-refund-uri \
    -m "$MERCHANT_URL" -k sandbox \
    -s "first refund" -a "TESTKUDOS:8" -r "TESTKUDOS:2" 2>>"$LOG" | grep -E -m 1 -o "taler://refund.*insecure=1")
echo -n "Balance after payment: "
taler-wallet-cli --wallet-db="$WALLET_DB" balance 2>>"$LOG"
echo "Handling refund: $REFUND_URI"
taler-wallet-cli --wallet-db="$WALLET_DB" --no-throttle handle-uri "$REFUND_URI" 2>"$LOG"
taler-wallet-cli --wallet-db="$WALLET_DB" run-until-done 2>>"$LOG" >>"$LOG"
echo -n "Balance after first refund: "
taler-wallet-cli --wallet-db="$WALLET_DB" balance 2>>"$LOG"
# TODO how to test second refund for same purchase?

exit_success
