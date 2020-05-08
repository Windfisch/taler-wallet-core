#!/bin/bash
# Script to check that Uris are properly handled when used a second time

source "common.sh"
normal_start_and_wait  "double-link"

echo "Getting pay taler:// Uri"
PAY_URI=$(taler-wallet-cli testing gen-pay-uri -m "$MERCHANT_URL" -k sandbox -a "TESTKUDOS:1" -s "foo" | grep -E -o 'taler://.*')
echo "Trying to pay without balance"
taler-wallet-cli --wallet-db=$WALLET_DB --no-throttle handle-uri --yes "$PAY_URI" 2>&1 | grep -q "insufficient balance" || exit_error "not reporting insufficient balance"
echo "Withdrawing"
taler-wallet-cli --wallet-db=$WALLET_DB --no-throttle testing withdraw -e "$EXCHANGE_URL" -b "$BANK_URL" -a "TESTKUDOS:10" > /dev/null
echo "Trying to pay again, should work this time"
taler-wallet-cli --wallet-db=$WALLET_DB --no-throttle handle-uri --yes "$PAY_URI" > /dev/null
echo "Trying to pay what was paid already should throw error"
taler-wallet-cli --wallet-db=$WALLET_DB --no-throttle handle-uri --yes "$PAY_URI" 2>&1 | grep -q "already paid" || exit_error "not reporting already paid"
echo "Already paid properly detected"

echo "SUCCESS"
exit 0
