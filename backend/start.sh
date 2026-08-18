#!/usr/bin/env bash
set -e
source venv14/bin/activate
uvicorn main:app --reload --port 8000