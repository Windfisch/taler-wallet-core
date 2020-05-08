#!/bin/bash
# Script to check that the wallet can handle refund URIs and actually process the refund

source "common.sh"
normal_start_and_wait "refund"

echo "Withdraw TESTKUDOS"
taler-wallet-cli --wallet-db="$WALLET_DB" --no-throttle testing withdraw -e "$EXCHANGE_URL" -b "$BANK_URL" -a "TESTKUDOS:10" >>"$LOG" 2>>"$LOG"
BALANCE_1=$(get_balance)
echo "Balance after withdrawal: $BALANCE_1"
REFUND_URI=$(taler-wallet-cli --wallet-db="$WALLET_DB" --no-throttle testing gen-refund-uri \
    -m "$MERCHANT_URL" -k sandbox \
    -s "first refund" -a "TESTKUDOS:8" -r "TESTKUDOS:2" 2>>"$LOG" | grep -E -m 1 -o "taler://refund.*insecure=1")
BALANCE_2=$(get_balance)
echo "Balance after payment: $BALANCE_2"
assert_less_than "$BALANCE_2" "$BALANCE_1"
taler-wallet-cli --wallet-db="$WALLET_DB" balance 2>>"$LOG"
echo "Handling refund: $REFUND_URI"
taler-wallet-cli --wallet-db="$WALLET_DB" --no-throttle handle-uri "$REFUND_URI" 2>"$LOG"
taler-wallet-cli --wallet-db="$WALLET_DB" run-until-done 2>>"$LOG" >>"$LOG"
BALANCE_3=$(get_balance)
echo "Balance after first refund: $BALANCE_3"
assert_greater_than "$BALANCE_3" "$BALANCE_2"
# TODO how to test second refund for same purchase?

exit_success
