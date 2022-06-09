#!/bin/bash

#https://datatracker.ietf.org/doc/html/rfc6455#page-65

COMMAND=$1
LEN=$(printf '%x\n' ${#COMMAND})

#text command
OPCODE=81

cat <(echo -n $OPCODE$LEN | xxd -r -p) <(echo -n $COMMAND) >> /tmp/send_signal

