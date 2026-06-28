#!/bin/bash
SQL_FILE=$1
if [ -z "$SQL_FILE" ]; then echo "❌ Укажи файл"; exit 1; fi
if [ ! -f "$SQL_FILE" ]; then echo "❌ Файл не найден: $SQL_FILE"; exit 1; fi
PROJECT_REF="uysubfuenfzzcoavbrch"
TOKEN="sbp_968863749817b11b171f33fb4d6f5604fd399e9b"
echo "🚀 Применяю: $SQL_FILE"
RESPONSE=$(python3 -c "
import urllib.request, json, sys
sql = open('$SQL_FILE').read()
data = json.dumps({'query': sql}).encode()
req = urllib.request.Request(
  'https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query',
  data=data,
  headers={
    'Authorization': 'Bearer ${TOKEN}',
    'Content-Type': 'application/json'
  }
)
try:
  res = urllib.request.urlopen(req)
  print('HTTP_CODE:' + str(res.status))
  print(res.read().decode())
except urllib.error.HTTPError as e:
  print('HTTP_CODE:' + str(e.code))
  print(e.read().decode())
")
echo "$RESPONSE"
if echo "$RESPONSE" | grep -q "HTTP_CODE:20"; then
  echo "✅ Миграция применена успешно"
else
  echo "❌ Ошибка"
  exit 1
fi
