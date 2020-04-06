#!/bin/bash
# Script to test revocation.
#
# Requires the wallet CLI to be installed and in the path.  Furthermore, the
# user running this script must be Postgres superuser and be allowed to
# create/drop databases.

set -eu

trap "kill `jobs -p` &> /dev/null || true" ERR
trap "kill `jobs -p` &> /dev/null || true" EXIT

# Exit, with status code "skip" (no 'real' failure)
function exit_skip() {
    echo $1
    exit 77
}

# Where do we write the result?
export BASEDB=${1:-"revoke-basedb"}

# Name of the Postgres database we will use for the script.
# Will be dropped, do NOT use anything that might be used
# elsewhere
export TARGET_DB=taler-auditor-revokedb
TMP_DIR=`mktemp -d revocation-tmp-XXXXXX`
export WALLET_DB=wallet-revocation.wallet.json
rm -f $WALLET_DB

# Configuration file will be edited, so we create one
# from the template.
export CONF=test-recoup.conf
cp template.conf $CONF


echo -n "Testing for taler-bank-manage"
taler-bank-manage -h >/dev/null </dev/null || exit_skip " MISSING"
echo " FOUND"
echo -n "Testing for taler-wallet-cli"
taler-wallet-cli -v >/dev/null </dev/null || exit_skip " MISSING"
echo " FOUND"



# Clean up
DATA_DIR=`taler-config -f -c $CONF -s PATHS -o TALER_HOME`
rm -rf $DATA_DIR || true

# reset database
dropdb $TARGET_DB >/dev/null 2>/dev/null || true
createdb $TARGET_DB || exit_skip "Could not create database $TARGET_DB"

# obtain key configuration data
MASTER_PRIV_FILE=`taler-config -f -c $CONF -s EXCHANGE -o MASTER_PRIV_FILE`
MASTER_PRIV_DIR=`dirname $MASTER_PRIV_FILE`
mkdir -p $MASTER_PRIV_DIR
gnunet-ecc -g1 $MASTER_PRIV_FILE > /dev/null
export MASTER_PUB=`gnunet-ecc -p $MASTER_PRIV_FILE`
export EXCHANGE_URL=`taler-config -c $CONF -s EXCHANGE -o BASE_URL`
MERCHANT_PORT=`taler-config -c $CONF -s MERCHANT -o PORT`
export MERCHANT_URL=http://localhost:${MERCHANT_PORT}/
BANK_PORT=`taler-config -c $CONF -s BANK -o HTTP_PORT`
export BANK_URL=http://localhost:${BANK_PORT}/
export AUDITOR_URL=http://localhost:8083/

# patch configuration
taler-config -c $CONF -s exchange -o MASTER_PUBLIC_KEY -V $MASTER_PUB
taler-config -c $CONF -s merchant-exchange-default -o MASTER_KEY -V $MASTER_PUB
taler-config -c $CONF -s exchangedb-postgres -o CONFIG -V postgres:///$TARGET_DB
taler-config -c $CONF -s auditordb-postgres -o CONFIG -V postgres:///$TARGET_DB
taler-config -c $CONF -s merchantdb-postgres -o CONFIG -V postgres:///$TARGET_DB
taler-config -c $CONF -s bank -o database -V postgres:///$TARGET_DB
taler-config -c $CONF -s exchange -o KEYDIR -V "${TMP_DIR}/keydir/"
taler-config -c $CONF -s exchange -o REVOCATION_DIR -V "${TMP_DIR}/revdir/"

# setup exchange
echo "Setting up exchange"
taler-exchange-dbinit -c $CONF
taler-exchange-wire -c $CONF 2> taler-exchange-wire.log
taler-exchange-keyup -L INFO -c $CONF -o e2a.dat 2> taler-exchange-keyup.log

# setup auditor
echo "Setting up auditor"
taler-auditor-dbinit -c $CONF
taler-auditor-exchange -c $CONF -m $MASTER_PUB -u $EXCHANGE_URL
taler-auditor-sign -c $CONF -u $AUDITOR_URL -r e2a.dat -o a2e.dat -m $MASTER_PUB
rm -f e2a.dat

# provide auditor's signature to exchange
ABD=`taler-config -c $CONF -s EXCHANGEDB -o AUDITOR_BASE_DIR -f`
mkdir -p $ABD
mv a2e.dat $ABD

# Launch services
echo "Launching services"
taler-bank-manage-testing $CONF postgres:///$TARGET_DB serve-http &> revocation-bank.log &
taler-exchange-httpd -c $CONF 2> taler-exchange-httpd.log &
EXCHANGE_PID=$!
taler-merchant-httpd -c $CONF -L INFO 2> taler-merchant-httpd.log &
MERCHANT_PID=$!
taler-exchange-wirewatch -c $CONF 2> taler-exchange-wirewatch.log &
taler-auditor-httpd -c $CONF 2> taler-auditor-httpd.log &

# Wait for all bank to be available (usually the slowest)
for n in `seq 1 50`
do
    echo -n "."
    sleep 0.2
    OK=0
    # bank
    wget http://localhost:8082/ -o /dev/null -O /dev/null >/dev/null || continue
    OK=1
    break
done
# Wait for all other services to be available
for n in `seq 1 50`
do
    echo -n "."
    sleep 0.1
    OK=0
    # exchange
    wget http://localhost:8081/ -o /dev/null -O /dev/null >/dev/null || continue
    # merchant
    wget http://localhost:9966/ -o /dev/null -O /dev/null >/dev/null || continue
    # Auditor
    wget http://localhost:8083/ -o /dev/null -O /dev/null >/dev/null || continue
    OK=1
    break
done


if [ 1 != $OK ]
then
    kill `jobs -p`
    wait
    exit_skip "Failed to launch services"
fi
echo " DONE"

# run wallet CLI
echo "Running wallet"
taler-wallet-cli --wallet-db=$WALLET_DB --no-throttle \
                 testing withdraw \
                 -e $EXCHANGE_URL \
                 -b $BANK_URL \
                 -a TESTKUDOS:8


export coins=$(taler-wallet-cli --wallet-db=$WALLET_DB advanced dump-coins)

# Find coin we want to revoke
export rc=$(echo "$coins" | jq -r '[.coins[] | select((.denom_value == "TESTKUDOS:2"))][0] | .coin_pub')
# Find the denom
export rd=$(echo "$coins" | jq -r '[.coins[] | select((.denom_value == "TESTKUDOS:2"))][0] | .denom_pub_hash')
echo "Revoking denomination ${rd} (to affect coin ${rc})"
# Find all other coins, which will be suspended
export susp=$(echo "$coins" | jq --arg rc "$rc" '[.coins[] | select(.coin_pub != $rc) | .coin_pub]')

# Do the revocation
taler-exchange-keyup -o e2a2.dat -c $CONF -r $rd
taler-auditor-sign -c $CONF -u $AUDITOR_URL -r e2a2.dat -o a2e2.dat -m $MASTER_PUB
rm e2a2.dat
mv a2e2.dat $ABD

# Restart the exchange...
kill -SIGUSR1 $EXCHANGE_PID
sleep 1 # Give exchange time to re-scan data
echo "Restarted the exchange post revocation"

# Now we suspend the other coins, so later we will pay with the recouped coin
taler-wallet-cli --wallet-db=$WALLET_DB advanced suspend-coins "$susp"

# Update exchange /keys so recoup gets scheduled
taler-wallet-cli --wallet-db=$WALLET_DB exchanges update \
                 -f $EXCHANGE_URL

# Block until scheduled operations are done
taler-wallet-cli --wallet-db=$WALLET_DB run-until-done

# Now we buy something, only the coins resulting from recouped will be
# used, as other ones are suspended
taler-wallet-cli --wallet-db=$WALLET_DB testing test-pay \
                 -m $MERCHANT_URL -k sandbox \
                 -a "TESTKUDOS:1" -s "foo"
taler-wallet-cli --wallet-db=$WALLET_DB run-until-done

echo "Purchase with recoup'ed coin (via reserve) done"

# Find coin we want to refresh, then revoke
export rrc=$(echo "$coins" | jq -r '[.coins[] | select((.denom_value == "TESTKUDOS:5"))][0] | .coin_pub')
# Find the denom
export zombie_denom=$(echo "$coins" | jq -r '[.coins[] | select((.denom_value == "TESTKUDOS:5"))][0] | .denom_pub_hash')

echo "Will refresh coin ${rrc} of denomination ${zombie_denom}"
# Find all other coins, which will be suspended
export susp=$(echo "$coins" | jq --arg rrc "$rrc" '[.coins[] | select(.coin_pub != $rrc) | .coin_pub]')

export rrc
export zombie_denom

# Travel into the future! (must match DURATION_WITHDRAW option)
export TIMETRAVEL="--timetravel=604800000000"

echo "Launching exchange 1 week in the future"
kill -TERM $EXCHANGE_PID
taler-exchange-httpd $TIMETRAVEL -c $CONF 2> taler-exchange-httpd.log &
export EXCHANGE_PID=$!

# Wait for exchange to be available
for n in `seq 1 50`
do
    echo -n "."
    sleep 0.1
    OK=0
    # exchange
    wget http://localhost:8081/ -o /dev/null -O /dev/null >/dev/null || continue
    OK=1
    break
done

echo "Refreshing coin $rrc"
taler-wallet-cli $TIMETRAVEL --wallet-db=$WALLET_DB advanced force-refresh "$rrc"
taler-wallet-cli $TIMETRAVEL --wallet-db=$WALLET_DB run-until-done

# Update our list of the coins
export coins=$(taler-wallet-cli $TIMETRAVEL --wallet-db=$WALLET_DB advanced dump-coins)

# Find resulting refreshed coin
export freshc=$(echo "$coins" | jq -r --arg rrc "$rrc" \
  '[.coins[] | select((.refresh_parent_coin_pub == $rrc) and .denom_value == "TESTKUDOS:0.1")][0] | .coin_pub'
)

# Find the denom of freshc
export fresh_denom=$(echo "$coins" | jq -r --arg rrc "$rrc" \
  '[.coins[] | select((.refresh_parent_coin_pub == $rrc) and .denom_value == "TESTKUDOS:0.1")][0] | .denom_pub_hash'
)

echo "Coin ${freshc} of denomination ${fresh_denom} is the result of the refresh"

# Find all other coins, which will be suspended
export susp=$(echo "$coins" | jq --arg freshc "$freshc" '[.coins[] | select(.coin_pub != $freshc) | .coin_pub]')


# Do the revocation of freshc
echo "Revoking ${fresh_denom} (to affect coin ${freshc})"
taler-exchange-keyup -c $CONF -o e2a3.dat -r $fresh_denom
taler-auditor-sign -c $CONF -u $AUDITOR_URL -r e2a3.dat -o a2e3.dat -m $MASTER_PUB
rm e2a3.dat
mv a2e3.dat $ABD

# Restart the exchange...
kill -SIGUSR1 $EXCHANGE_PID
sleep 1 # give exchange time to re-scan data


# Now we suspend the other coins, so later we will pay with the recouped coin
taler-wallet-cli $TIMETRAVEL --wallet-db=$WALLET_DB advanced suspend-coins "$susp"

# Update exchange /keys so recoup gets scheduled
taler-wallet-cli $TIMETRAVEL --wallet-db=$WALLET_DB exchanges update \
                 -f $EXCHANGE_URL

# Block until scheduled operations are done
taler-wallet-cli $TIMETRAVEL --wallet-db=$WALLET_DB run-until-done

echo "Restarting merchant (so new keys are known)"
kill -TERM $MERCHANT_PID
taler-merchant-httpd -c $CONF -L INFO 2> taler-merchant-httpd.log &
MERCHANT_PID=$!
# Wait for merchant to be again available
for n in `seq 1 50`
do
    echo -n "."
    sleep 0.1
    OK=0
    # merchant
    wget http://localhost:9966/ -o /dev/null -O /dev/null >/dev/null || continue
    OK=1
    break
done

# Now we buy something, only the coins resulting from recoup+refresh will be
# used, as other ones are suspended
taler-wallet-cli $TIMETRAVEL --wallet-db=$WALLET_DB testing test-pay \
                 -m $MERCHANT_URL -k sandbox \
                 -a "TESTKUDOS:0.02" -s "bar"
taler-wallet-cli $TIMETRAVEL --wallet-db=$WALLET_DB run-until-done

echo "Bought something with refresh-recouped coin"

echo "Shutting down services"
kill `jobs -p`
wait

# clean up
echo "Final clean up (disabled)"
dropdb $TARGET_DB
rm -r $DATA_DIR || true
rm $CONF
rm -r $TMP_DIR

exit 0
