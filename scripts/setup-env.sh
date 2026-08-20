#!/bin/sh
# Creates or completes the .env file next to docker-compose.yml.
#
# Idempotent: every secret that already has a value is left untouched, so it is
# safe to re-run after pulling a new version that introduced a new variable.
#
#   ./scripts/setup-env.sh            # create/complete .env
#   ./scripts/setup-env.sh --print    # also show the generated admin password

set -eu

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
ENV_FILE="$ROOT_DIR/.env"
EXAMPLE_FILE="$ROOT_DIR/.env.example"

PRINT_SECRETS=0
[ "${1:-}" = "--print" ] && PRINT_SECRETS=1

if [ ! -f "$EXAMPLE_FILE" ]; then
  echo "error: $EXAMPLE_FILE is missing." >&2
  exit 1
fi

# --------------------------------------------------------------- random values
# Stripping the non-alphanumeric characters out of base64 shortens the result by
# an unpredictable amount, so draw until the requested length is reached.
random_chars() {
  length=$1
  charset=$2
  out=''

  while [ "${#out}" -lt "$length" ]; do
    if command -v openssl >/dev/null 2>&1; then
      chunk=$(openssl rand -base64 96 | tr -dc "$charset")
    else
      chunk=$(tr -dc "$charset" < /dev/urandom | head -c "$((length * 2))")
    fi
    out="${out}${chunk}"
  done

  printf '%s' "$out" | cut -c "1-$length"
}

random_string() {
  random_chars "$1" 'A-Za-z0-9'
}

# A password a human retypes once, so ambiguous characters (O/0, l/1, I) are
# excluded. Guaranteed to contain a letter and a digit, which is what the API
# requires when the administrator later changes it.
random_password() {
  while :; do
    candidate=$(random_chars 20 'A-HJ-NP-Za-km-z2-9')
    case "$candidate" in
      *[0-9]*) ;;
      *) continue ;;
    esac
    case "$candidate" in
      *[A-Za-z]*) printf '%s' "$candidate"; return ;;
    esac
  done
}

if [ ! -f "$ENV_FILE" ]; then
  cp "$EXAMPLE_FILE" "$ENV_FILE"
  echo "Created .env from .env.example"
else
  echo "Found an existing .env — completing it without touching existing values"
  # Append any variable present in the example but absent from .env.
  while IFS= read -r line; do
    case "$line" in
      ''|\#*) continue ;;
    esac
    key=${line%%=*}
    if ! grep -q "^${key}=" "$ENV_FILE"; then
      printf '%s\n' "$line" >> "$ENV_FILE"
      echo "  + added missing variable ${key}"
    fi
  done < "$EXAMPLE_FILE"
fi

# ------------------------------------------------------------ fill the secrets
# Only replaces `KEY=` with an empty value, never an existing one.
set_if_empty() {
  key=$1
  value=$2
  current=$(grep "^${key}=" "$ENV_FILE" | head -n 1 | cut -d= -f2-)

  if [ -z "$current" ]; then
    tmp="${ENV_FILE}.tmp"
    awk -v k="$key" -v v="$value" \
      'index($0, k "=") == 1 { print k "=" v; next } { print }' \
      "$ENV_FILE" > "$tmp"
    mv "$tmp" "$ENV_FILE"
    echo "  * generated ${key}"
    return 0
  fi

  echo "  = kept existing ${key}"
  return 1
}

echo "Secrets:"
DB_PASSWORD=$(random_string 32)
STORAGE_PASSWORD=$(random_string 32)
ADMIN_PASSWORD=$(random_password)

set_if_empty POSTGRES_PASSWORD "$DB_PASSWORD" || true
set_if_empty MINIO_ROOT_PASSWORD "$STORAGE_PASSWORD" || true
set_if_empty JWT_SECRET "$(random_string 64)" || true
set_if_empty JWT_REFRESH_SECRET "$(random_string 64)" || true

admin_generated=0
if set_if_empty ADMIN_SEED_PASSWORD "$ADMIN_PASSWORD"; then
  admin_generated=1
fi

# MinIO uses one credential pair; the API must be given the same secret.
storage_secret=$(grep '^MINIO_ROOT_PASSWORD=' "$ENV_FILE" | head -n 1 | cut -d= -f2-)
storage_user=$(grep '^MINIO_ROOT_USER=' "$ENV_FILE" | head -n 1 | cut -d= -f2-)
set_if_empty MINIO_SECRET_KEY "$storage_secret" || true
set_if_empty MINIO_ACCESS_KEY "$storage_user" || true

chmod 600 "$ENV_FILE" 2>/dev/null || true

echo
echo "Done. .env is ready (permissions 600)."

if [ "$admin_generated" -eq 1 ]; then
  admin_email=$(grep '^ADMIN_SEED_EMAIL=' "$ENV_FILE" | head -n 1 | cut -d= -f2-)
  echo
  echo "  ---------------------------------------------------------------"
  echo "   First administrator login"
  echo "   email    : ${admin_email}"
  if [ "$PRINT_SECRETS" -eq 1 ]; then
    echo "   password : ${ADMIN_PASSWORD}"
  else
    echo "   password : see ADMIN_SEED_PASSWORD in .env"
  fi
  echo "   A new password is required at first login."
  echo "  ---------------------------------------------------------------"
fi

echo
echo "Next:  docker compose build && docker compose up -d"
