#!/bin/bash
# Script to check that the wallet can not double spend coins and handles this error well

source "common.sh"
normal_start_and_wait  "double-spend"

echo "Withdraw TESTKUDOS"
taler-wallet-cli --wallet-db="$WALLET_DB" --no-throttle testing withdraw -e "$EXCHANGE_URL" -b "$BANK_URL" -a "TESTKUDOS:10" >/dev/null
# Copy wallet database before spending coins
cp "$WALLET_DB" "$WALLET_DB.bak"
echo "Spend all the money"
taler-wallet-cli --wallet-db="$WALLET_DB" testing test-pay -m "$MERCHANT_URL" -k sandbox -a "TESTKUDOS:9.5" -s "foo"
echo "New balance: $(get_balance)"
# Restore old wallet database
mv "$WALLET_DB.bak" "$WALLET_DB"
echo "Balance after getting old coins back: $(get_balance)"
echo "Try to double-spend"
# TODO this should probably fail more gracefully
# "exchange_reply: { hint: 'insufficient funds', code: 1200 }
taler-wallet-cli --wallet-db="$WALLET_DB" testing test-pay -m "$MERCHANT_URL" -k sandbox -a "TESTKUDOS:9.5" -s "foo"

exit_success
