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

# ------------------------------------------------- existing deployment lookup
# Before the .env file existed, docker-compose.yml carried hardcoded defaults, so
# the volumes on an already-deployed server were initialised with those. Making
# up new credentials here would lock the API out of its own database, so the ones
# actually in use are recovered first.
LEGACY_POSTGRES_PASSWORD='postgres'
LEGACY_MINIO_PASSWORD='SuperSecretPassword123!'

has_docker() {
  command -v docker >/dev/null 2>&1
}

# Reads a variable from a container that already exists, running or stopped.
from_container() {
  container=$1
  var=$2
  has_docker || return 1
  docker inspect "$container" --format '{{range .Config.Env}}{{println .}}{{end}}' 2>/dev/null     | grep "^${var}=" | head -n 1 | cut -d= -f2- | tr -d '
'
}

volume_exists() {
  has_docker || return 1
  docker volume ls --format '{{.Name}}' 2>/dev/null | grep -q "_$1\$"
}

RECOVERED_DB=$(from_container lds-postgres POSTGRES_PASSWORD || true)
RECOVERED_STORAGE=$(from_container lds-minio MINIO_ROOT_PASSWORD || true)
RECOVERED_JWT=$(from_container lds-backend JWT_SECRET || true)
RECOVERED_JWT_REFRESH=$(from_container lds-backend JWT_REFRESH_SECRET || true)

EXISTING_DEPLOYMENT=0
if [ -n "$RECOVERED_DB" ] || [ -n "$RECOVERED_STORAGE" ]; then
  EXISTING_DEPLOYMENT=1
  echo "Existing containers found - reusing the credentials they were started with."
elif volume_exists postgres_data || volume_exists minio_data; then
  EXISTING_DEPLOYMENT=1
  RECOVERED_DB="$LEGACY_POSTGRES_PASSWORD"
  RECOVERED_STORAGE="$LEGACY_MINIO_PASSWORD"
  echo "Existing data volumes found but no container to read from."
  echo "Assuming the defaults this project used before .env existed."
fi

# Overwrites unconditionally. Only used for values that MUST match what an
# existing volume was created with, where a stale .env would break the stack.
force_set() {
  key=$1
  value=$2
  current=$(grep "^${key}=" "$ENV_FILE" | head -n 1 | cut -d= -f2-)
  [ "$current" = "$value" ] && return 0

  tmp="${ENV_FILE}.tmp"
  awk -v k="$key" -v v="$value"     'index($0, k "=") == 1 { print k "=" v; next } { print }'     "$ENV_FILE" > "$tmp"
  mv "$tmp" "$ENV_FILE"
  echo "  ! aligned ${key} on the existing deployment"
}

echo "Secrets:"
ADMIN_PASSWORD=$(random_password)

# A recovered value is reused; otherwise a fresh strong secret is generated.
set_if_empty POSTGRES_PASSWORD "${RECOVERED_DB:-$(random_string 32)}" || true
set_if_empty MINIO_ROOT_PASSWORD "${RECOVERED_STORAGE:-$(random_string 32)}" || true
set_if_empty JWT_SECRET "${RECOVERED_JWT:-$(random_string 64)}" || true
set_if_empty JWT_REFRESH_SECRET "${RECOVERED_JWT_REFRESH:-$(random_string 64)}" || true

# The database name and user are part of the volume too.
if [ "$EXISTING_DEPLOYMENT" -eq 1 ]; then
  RECOVERED_DB_USER=$(from_container lds-postgres POSTGRES_USER || true)
  RECOVERED_DB_NAME=$(from_container lds-postgres POSTGRES_DB || true)
  RECOVERED_STORAGE_USER=$(from_container lds-minio MINIO_ROOT_USER || true)
  [ -n "$RECOVERED_DB_USER" ] && force_set POSTGRES_USER "$RECOVERED_DB_USER"
  [ -n "$RECOVERED_DB_NAME" ] && force_set POSTGRES_DB "$RECOVERED_DB_NAME"
  [ -n "$RECOVERED_STORAGE_USER" ] && force_set MINIO_ROOT_USER "$RECOVERED_STORAGE_USER"
fi

admin_generated=0
if set_if_empty ADMIN_SEED_PASSWORD "$ADMIN_PASSWORD"; then
  admin_generated=1
fi

# MinIO has a single credential pair. In Docker these two are derived from
# MINIO_ROOT_* by docker-compose.yml and the values below are only read when
# running the API outside Docker - but a .env that contradicts itself is a trap,
# so they are kept in step.
storage_secret=$(grep '^MINIO_ROOT_PASSWORD=' "$ENV_FILE" | head -n 1 | cut -d= -f2-)
storage_user=$(grep '^MINIO_ROOT_USER=' "$ENV_FILE" | head -n 1 | cut -d= -f2-)
force_set MINIO_SECRET_KEY "$storage_secret"
force_set MINIO_ACCESS_KEY "$storage_user"

chmod 600 "$ENV_FILE" 2>/dev/null || true

# ------------------------------------------------------- verify against the DB
# PostgreSQL only reads POSTGRES_PASSWORD when it creates its data directory. On
# an existing volume the stored password wins, so a value in .env that no longer
# matches authenticates nowhere - and the API crash-loops with P1000. Catching it
# here is far cheaper than reading it out of container logs later.
verify_postgres() {
  has_docker || return 0
  docker compose version >/dev/null 2>&1 || return 0
  docker compose ps --format '{{.Name}} {{.State}}' 2>/dev/null     | grep -q 'lds-postgres running' || return 0

  pw=$(grep '^POSTGRES_PASSWORD=' "$ENV_FILE" | head -n 1 | cut -d= -f2-)
  user=$(grep '^POSTGRES_USER=' "$ENV_FILE" | head -n 1 | cut -d= -f2-)
  db=$(grep '^POSTGRES_DB=' "$ENV_FILE" | head -n 1 | cut -d= -f2-)
  [ -n "$pw" ] && [ -n "$user" ] || return 0

  echo
  echo "Checking the database password against the running container..."

  # -h forces password authentication; the unix socket would be trusted.
  if docker compose exec -T -e PGPASSWORD="$pw" postgres        psql -h 127.0.0.1 -U "$user" -d "${db:-lds_db}" -c 'SELECT 1' >/dev/null 2>&1; then
    echo "  OK - the password in .env authenticates."
    return 0
  fi

  cat <<MSG

  ----------------------------------------------------------------
   WARNING: the database rejects the password in .env.

   The volume was created with a different one, and PostgreSQL keeps
   the password inside the database, not in the environment.

   Either restore the original value in .env, or align the database
   on the current one:

     docker compose exec -T postgres psql -U ${user} -d ${db:-lds_db} -c "ALTER USER ${user} WITH PASSWORD '${pw}';"

   Then:  docker compose up -d
  ----------------------------------------------------------------
MSG
  return 1
}

DB_CHECK_FAILED=0
verify_postgres || DB_CHECK_FAILED=1

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
if [ "$DB_CHECK_FAILED" -eq 1 ]; then
  echo "Next:  resolve the database password warning above first."
else
  echo "Next:  docker compose build && docker compose up -d"
fi
