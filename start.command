#!/bin/bash
cd "$(dirname "$0")" || exit 1
if [ ! -x .venv/bin/python ]; then
  echo "Install the Python dependencies first; see README.md."
  exit 1
fi
exec .venv/bin/python backend/server.py
