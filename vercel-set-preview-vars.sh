#!/bin/bash

# This script sets Convex environment variables during Vercel builds.
# It reads from Vercel env vars and pushes them to the Convex deployment.
# Runs on both production and preview deployments.

# inspired by conversation here: https://github.com/get-convex/convex-backend/issues/123
# and here: https://discord.com/channels/1019350475847499849/1019350478817079338/1467722898067292324

# Helper: set a Convex env var, handling preview vs production
set_convex_env() {
  local name="$1"
  local value="$2"

  if [ "$VERCEL_TARGET_ENV" = "preview" ]; then
    npx convex env set --preview-name "$VERCEL_GIT_COMMIT_REF" "$name" "$value"
  else
    npx convex env set "$name" "$value"
  fi
}

# Determine SITE_URL based on environment
if [ "$VERCEL_TARGET_ENV" = "preview" ]; then
  SITE_URL="https://$VERCEL_BRANCH_URL"
elif [ "$VERCEL_TARGET_ENV" = "production" ]; then
  SITE_URL="https://$VERCEL_PROJECT_PRODUCTION_URL"
fi

# Set SITE_URL on Convex
if [ -n "$SITE_URL" ]; then
  echo "Setting SITE_URL to $SITE_URL"
  set_convex_env SITE_URL "$SITE_URL"
fi

# Set JWT_PRIVATE_KEY on Convex (multiline PEM — write to temp file, read back)
if [ -n "$JWT_PRIVATE_KEY" ]; then
  echo "Setting JWT_PRIVATE_KEY on Convex..."
  TMPFILE=$(mktemp)
  printf '%s' "$JWT_PRIVATE_KEY" > "$TMPFILE"
  if [ "$VERCEL_TARGET_ENV" = "preview" ]; then
    npx convex env set --preview-name "$VERCEL_GIT_COMMIT_REF" JWT_PRIVATE_KEY "$(cat "$TMPFILE")"
  else
    npx convex env set JWT_PRIVATE_KEY "$(cat "$TMPFILE")"
  fi
  rm -f "$TMPFILE"
fi

# Set JWKS on Convex
if [ -n "$JWKS" ]; then
  echo "Setting JWKS on Convex..."
  set_convex_env JWKS "$JWKS"
fi
