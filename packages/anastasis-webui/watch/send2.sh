#!/bin/bash

#https://datatracker.ietf.org/doc/html/rfc6455#page-65

CONTENT=$( cat $1 | base64 -w 0 )
COMMAND='{"type":"UPDATE","'$CONTENT'"}'
LEN=$(printf '%0*x\n' 4 ${#COMMAND})
echo $LEN
LEN=00000138
#text command
OPCODE=81

cat <(echo -n $OPCODE$LEN | xxd -r -p) <(echo -n $COMMAND) >> /tmp/send_signal

