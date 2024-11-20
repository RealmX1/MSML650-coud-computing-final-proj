#!/bin/bash

# Export variables from .env file
export PUBLIC_URL="https://quiet-lark-charming.ngrok-free.app"
export ZOOM_HOST="https://zoom.us"
export SESSION_SECRET="0c9a1772cfb257dba1ac0ecf0bea8541"
export ZOOM_APP_CLIENT_ID="Tqp1AHMBSZm5KD4H5u2jg"
export ZOOM_APP_CLIENT_SECRET="jY7OhXpo5AMYup6yw7Zjrds7aC91Lmtt"
export ZOOM_APP_OAUTH_STATE_SECRET="81a8bf0458a887e7fd8bf8dcacf2a3a1"
export REDIS_ENCRYPTION_KEY="14817842305b02235dc4682ca3f41152"
export REDIS_URL="redis://redis:6379/1"

# Set Auth0 variables (empty in .env file)
export AUTH0_CLIENT_ID=""
export AUTH0_CLIENT_SECRET=""
export AUTH0_ISSUER_BASE_URL=""

# Set derived variables
export ZOOM_APP_CLIENT_URL="http://frontend:9090"
export ZOOM_APP_REDIRECT_URI="${PUBLIC_URL}/api/zoomapp/auth"

# Set React specific variables
export REACT_APP_PUBLIC_ROOT="${PUBLIC_URL}"
export REACT_APP_AUTH0_CLIENT_ID="${AUTH0_CLIENT_ID}"
export REACT_APP_AUTH0_CLIENT_SECRET="${AUTH0_CLIENT_SECRET}"
export REACT_APP_AUTH0_ISSUER_BASE_URL="${AUTH0_ISSUER_BASE_URL}"