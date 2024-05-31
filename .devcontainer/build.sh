#!/bin/bash
# This is a script used by the devcontainer to build the project

yarn install-local-ssl
yarn install --pure-lockfile

# Create a new .env file and configure it
NEW_ENV_FILENAME=.env
cp .env.sample $NEW_ENV_FILENAME

# define functions
replace_env() {
    # Replace an environment variable in the .env file
    local key=$1
    local value=$2
    local filename=$3
    if [ -z "$filename" ]; then
        filename=".env"
    fi
    sed -i "s|^${key}=.*|${key}=${value}|" "$filename"
}

replace_secret() {
    # Replace an environment variable with a random value in the .env file
    local key=$1
    local filename=$2
    local new_value=$(openssl rand -hex 32)
    replace_env "$key" "$new_value" "$filename"
}

remove_env() {
    # Remove an environment variable from the .env file
    local key=$1
    local filename=$2
    if [ -z "$filename" ]; then
        filename=".env"
    fi
    sed -i "/^${key}=/d" "$filename"
}

comment_out_env() {
    # Comment out an environment variable in the .env file
    local key=$1
    local filename=$2
    if [ -z "$filename" ]; then
        filename=".env"
    fi
    sed -i "s/^${key}=/#&/" "$filename"
}

# Replace the SECRET_KEY and UTILS_SECRET with random values
replace_secret "SECRET_KEY" "$NEW_ENV_FILENAME"
replace_secret "UTILS_SECRET" "$NEW_ENV_FILENAME"

# configure the DATABASE_URL and REDIS_URL
# DATABASE_URL=postgres://user:pass@postgres:5432/outline
# replace_env "DATABASE_URL" "$DATABASE_URL" "$NEW_ENV_FILENAME"
REDIS_URL=redis://redis:6379
replace_env "REDIS_URL" "$REDIS_URL" "$NEW_ENV_FILENAME"

# configure the URL
URL=https://localhost:3000
replace_env "URL" "$URL" "$NEW_ENV_FILENAME"
replace_env "URL" "$URL" ".env.development"

# configure the NODE_ENV
NODE_ENV=development
replace_env "NODE_ENV" "$NODE_ENV" "$NEW_ENV_FILENAME"

# configure the IFRAMELY_URL
comment_out_env "IFRAMELY_URL" "$NEW_ENV_FILENAME"

# create the data directory and change the permissions
DATA_DIR=/var/lib/outline/data
sudo mkdir -p $DATA_DIR
sudo chmod -R 777 $DATA_DIR
