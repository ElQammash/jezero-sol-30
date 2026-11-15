#!/usr/bin/env bash
# TUS upload of a file to Hostinger file storage: scripts/upload.sh <file> <url> <auth_key> <rest_auth_key>
set -e
FILE="$1"; URL="$2"; AK="$3"; RK="$4"
NAME=$(basename "$FILE")
SIZE=$(wc -c < "$FILE")
curl -sS -o /dev/null -w "POST %{http_code}\n" -X POST "$URL/$NAME?override=true" -H "X-Auth: $AK" -H "X-Auth-Rest: $RK" -H "Tus-Resumable: 1.0.0" -H "Upload-Length: $SIZE" -H "Upload-Offset: 0"
curl -sS -D - -o /dev/null -X PATCH "$URL/$NAME?override=true" -H "X-Auth: $AK" -H "X-Auth-Rest: $RK" -H "Tus-Resumable: 1.0.0" -H "Content-Type: application/offset+octet-stream" -H "Upload-Offset: 0" --data-binary "@$FILE" | grep -iE "^HTTP/1.1 2|upload-offset"
echo "size $SIZE"
