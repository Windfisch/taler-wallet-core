#!/bin/bash

COMMAND='{"type":"RELOAD"}'
LEN=$(printf '%x\n' ${#COMMAND})
OPCODE=81
cat <(echo -n $OPCODE$LEN | xxd -r -p) <(echo -n $COMMAND) | socat - UNIX-SEND:./send_signal

