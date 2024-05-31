#!/bin/bash
# This is a script used by the devcontainer to build the project

yarn install-local-ssl
yarn install --pure-lockfile

NEW_ENV_FILENAME=.env
cp .env.sample $NEW_ENV_FILENAME

replace_env() {
  local key=$1
  local value=$2
  local filename=$3
  
  if [ -z "$filename" ]; then
      filename=".env"
  fi
  
  sed -i "s/^${key}=.*/${key}=${value}/" "$filename"
}

replace_secret() {
  local key=$1
  local filename=$2
  local new_value=$(openssl rand -hex 32)
  replace_env "$key" "$new_value" "$filename"
}

remove_env() {
  local key=$1
  local filename=$2
  
  if [ -z "$filename" ]; then
      filename=".env"
  fi
  
  sed -i "/^${key}=/d" "$filename"
}

comment_out_env() {
  local key=$1
  local filename=$2
  
  if [ -z "$filename" ]; then
      filename=".env"
  fi
  
  sed -i "s/^${key}=/#&/" "$filename"
}

replace_secret "SECRET_KEY" "$NEW_ENV_FILENAME"
replace_secret "UTILS_SECRET" "$NEW_ENV_FILENAME"


DATABASE_URL=postgres://user:pass@postgres:5432/outline
REDIS_URL=redis://redis:6379

remove_env "DATABASE_URL" “$DATABASE_URL” "$NEW_ENV_FILENAME"
remove_env "REDIS_URL" "$REDIS_URL" "$NEW_ENV_FILENAME"

comment_out_env "IFRAMELY_URL" "$NEW_ENV_FILENAME"