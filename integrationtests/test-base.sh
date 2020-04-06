#!/bin/bash
# Script to generate the basic database for auditor
# testing from a 'correct' interaction between exchange,
# wallet and merchant.


set -eu

trap "kill `jobs -p` &> /dev/null || true" ERR
trap "kill `jobs -p` &> /dev/null || true" EXIT

# Exit, with status code "skip" (no 'real' failure)
function exit_skip() {
    echo $1
    exit 77
}

# Where do we write the result?
BASEDB=${1:-"auditor-basedb"}

# Name of the Postgres database we will use for the script.
# Will be dropped, do NOT use anything that might be used
# elsewhere
TARGET_DB=taler-auditor-basedb

# Configuration file will be edited, so we create one
# from the template.
CONF=test-base.conf
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
MASTER_PUB=`gnunet-ecc -p $MASTER_PRIV_FILE`
EXCHANGE_URL=`taler-config -c $CONF -s EXCHANGE -o BASE_URL`
MERCHANT_PORT=`taler-config -c $CONF -s MERCHANT -o PORT`
MERCHANT_URL=http://localhost:${MERCHANT_PORT}/
BANK_PORT=`taler-config -c $CONF -s BANK -o HTTP_PORT`
BANK_URL=http://localhost:${BANK_PORT}/
AUDITOR_URL=http://localhost:8083/

# patch configuration
taler-config -c $CONF -s exchange -o MASTER_PUBLIC_KEY -V $MASTER_PUB
taler-config -c $CONF -s merchant-exchange-default -o MASTER_KEY -V $MASTER_PUB
taler-config -c $CONF -s exchangedb-postgres -o CONFIG -V postgres:///$TARGET_DB
taler-config -c $CONF -s auditordb-postgres -o CONFIG -V postgres:///$TARGET_DB
taler-config -c $CONF -s merchantdb-postgres -o CONFIG -V postgres:///$TARGET_DB
taler-config -c $CONF -s bank -o database -V postgres:///$TARGET_DB

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
taler-bank-manage-testing $CONF postgres:///$TARGET_DB serve-http &
taler-exchange-httpd -c $CONF 2> taler-exchange-httpd.log &
taler-merchant-httpd -c $CONF -L INFO 2> taler-merchant-httpd.log &
taler-exchange-wirewatch -c $CONF 2> taler-exchange-wirewatch.log &
taler-auditor-httpd -c $CONF 2> taler-auditor-httpd.log &

# Wait for all services to be available
for n in `seq 1 50`
do
    echo -n "."
    sleep 0.1
    OK=0
    # exchange
    wget http://localhost:8081/ -o /dev/null -O /dev/null >/dev/null || continue
    # merchant
    wget http://localhost:9966/ -o /dev/null -O /dev/null >/dev/null || continue
    # bank
    wget http://localhost:8082/ -o /dev/null -O /dev/null >/dev/null || continue
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
taler-wallet-cli testing integrationtest -e $EXCHANGE_URL -m $MERCHANT_URL -b $BANK_URL

echo "Shutting down services"
kill `jobs -p`
wait

# clean up
echo "Final clean up"
dropdb $TARGET_DB

rm -rf $DATA_DIR || true
rm $CONF

exit 0
