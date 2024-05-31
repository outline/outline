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

replace_secret "SECRET_KEY" "$NEW_ENV_FILENAME"
replace_secret "UTILS_SECRET" "$NEW_ENV_FILENAME"

