#!/bin/bash
SERVER_KEY=258EAFA5-E914-47DA-95CA-C5AB0DC85B11

while read line; do
  LINE=$(echo $line | tr -d '\r')
  case $LINE in 
    Sec-WebSocket-Key:*)
      CLIENT_KEY="${LINE:19}"
      export WS_ACCEPT=$( echo -n $CLIENT_KEY$SERVER_KEY | sha1sum | xxd -r -p | base64 )
      ;;
     "") break ;;
  esac
done

cat watch/web_socket_server.reply | sed 's/$'"/`echo \\\r`/" | envsubst '$WS_ACCEPT'

tail -n 0 -F /tmp/send_signal 2> /dev/null

