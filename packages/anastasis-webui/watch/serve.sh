#!/bin/bash

socat TCP-LISTEN:8003,fork,reuseaddr,keepalive EXEC:"./watch/reply.sh"

