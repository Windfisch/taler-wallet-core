#!/bin/bash
# Script to check that the wallet does a withdrawal correctly

source "common.sh"
normal_start_and_wait "withdrawal"

echo "Withdraw 5 TESTKUDOS"
taler-wallet-cli --wallet-db="$WALLET_DB" --no-throttle testing withdraw -e "$EXCHANGE_URL" -b "$BANK_URL" -a "TESTKUDOS:5" >>"$LOG" 2>>"$LOG"
BALANCE_1=$(get_balance)
assert_equal "$BALANCE_1" "TESTKUDOS:4.84"
echo "Balance after withdrawal: $BALANCE_1"

echo "Withdraw 10 TESTKUDOS"
taler-wallet-cli --wallet-db="$WALLET_DB" --no-throttle testing withdraw -e "$EXCHANGE_URL" -b "$BANK_URL" -a "TESTKUDOS:10" >>"$LOG" 2>>"$LOG"
BALANCE_2=$(get_balance)
assert_equal "$BALANCE_2" "TESTKUDOS:14.66"
echo "Balance after withdrawal: $BALANCE_2"

exit_success
