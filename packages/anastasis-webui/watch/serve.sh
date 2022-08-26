#!/bin/bash

#clean up
rm /tmp/send_signal

socat TCP-LISTEN:8003,fork,reuseaddr,keepalive EXEC:"./watch/reply.sh"

