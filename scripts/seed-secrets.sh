#!/usr/bin/env bash
set -e

SECRETS_DIR="./secrets"

SECRET_NAMES=(
  "auth0_mgmt_client_secret"
  "db_password"
  "emalify_api_key"
  "frontend_auth0_client_secret"
  "frontend_auth0_secret"
  "malipo_callback_secret_path"
  "malipo_webhook_secret"
  "mpesa_callback_secret_path"
  "mpesa_consumer_key"
  "mpesa_consumer_secret"
  "mpesa_passkey"
  "redis_password"
)

mkdir -p "$SECRETS_DIR"

created_count=0
skipped_count=0

for name in "${SECRET_NAMES[@]}"; do
  file_path="$SECRETS_DIR/${name}.txt"

  if [ -f "$file_path" ]; then
    echo "Skipped: $name (already exists)"
    skipped_count=$((skipped_count + 1))
    continue
  fi

  read -rsp "Enter value for $name: " value
  echo
  printf '%s' "$value" > "$file_path"
  chmod 644 "$file_path"
  created_count=$((created_count + 1))
done

echo "Done. Created: $created_count, Skipped: $skipped_count"