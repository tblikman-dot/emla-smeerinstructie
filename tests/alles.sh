#!/bin/bash
cd "$(dirname "$0")"
stuk=0
for f in "$@"; do
  out=$(timeout 150 python3 "$f" 2>&1); rc=$?
  fails=$(echo "$out" | grep -cE '^FAIL')
  tb=$(echo "$out" | grep -cE 'Traceback|Error:')
  err=$(echo "$out" | grep -o 'errors: \[.*\]' | tail -1)
  st="OK"
  if [ "$rc" != "0" ] || [ "$fails" != "0" ] || [ "$tb" != "0" ] || [ "$err" != "errors: []" ]; then st="STUK"; stuk=1; fi
  printf "%-17s %-5s rc=%s fails=%s tb=%s %s\n" "$f" "$st" "$rc" "$fails" "$tb" "$err"
  [ "$st" = "STUK" ] && echo "$out" | grep -E "^FAIL|Error:" | head -3
done
echo "---"; [ $stuk = 0 ] && echo "ALLES GROEN" || echo "ER IS IETS STUK"
