#!/usr/bin/env sh
set -e

# 1) Instance folder
mkdir -p /app/instance

# 2) Opcioni seed uvek (ako je SEED_ON_EVERY_START=true)
if [ "${SEED_ON_EVERY_START}" = "true" ]; then
  echo "[entrypoint] SEED_ON_EVERY_START=true → pokrećem seed.py"
  python /app/seed.py || echo "[entrypoint] seed.py završio (ili greška ignorisana za nastavak)"
else
  # 3) Seed samo ako baza ne postoji
  DB_PATH=${DB_PATH:-/app/instance/app.db}
  if [ ! -f "$DB_PATH" ]; then
    echo "[entrypoint] DB ne postoji ($DB_PATH) → pokrećem seed.py"
    python /app/seed.py || echo "[entrypoint] seed.py završio (ili greška ignorisana za nastavak)"
  else
    echo "[entrypoint] DB postoji ($DB_PATH) → preskačem seeding"
  fi
fi

# 4) Start backend
echo "[entrypoint] Pokrećem Flask app"
exec python /app/app.py
