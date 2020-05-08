#!/bin/bash
# Script to generate the basic database for auditor
# testing from a 'correct' interaction between exchange,
# wallet and merchant.

source "common.sh"
normal_start_and_wait "base"

# run wallet CLI
echo "Running wallet"
taler-wallet-cli testing integrationtest -e "$EXCHANGE_URL" -m "$MERCHANT_URL" -b "$BANK_URL"

exit_success
