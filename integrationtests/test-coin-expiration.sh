#!/bin/bash
# Script to check that the wallet automatically refreshes coins for they expire

source "common.sh"
normal_start_and_wait "coin-expiration"

echo "Withdraw TESTKUDOS"
taler-wallet-cli --wallet-db="$WALLET_DB" --no-throttle testing withdraw -e "$EXCHANGE_URL" -b "$BANK_URL" -a "TESTKUDOS:10" >>"$LOG" 2>>"$LOG"
echo "Balance after withdrawal: $(get_balance)"

# TODO time-travel to check that wallet actually refreshed coin before expiration
taler-wallet-cli --wallet-db="$WALLET_DB" advanced dump-coins

exit_success
