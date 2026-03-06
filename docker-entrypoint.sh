#!/bin/sh
set -eu

if [ -d /docker-entrypoint.d ]; then
  for script in /docker-entrypoint.d/*.sh; do
    [ -f "$script" ] || continue
    echo "Running startup script: $script"
    sh "$script"
  done
fi

exec "$@"
