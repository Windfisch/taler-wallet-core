#!/bin/bash

socat TCP-LISTEN:8003,fork EXEC:"./watch/reply.sh"

