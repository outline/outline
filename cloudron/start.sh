#!/bin/bash

## This file builds Outline env variables from Cloudron variables
#
# Here's a list of all env variables made available by Cloudron
#
### Postgres
# CLOUDRON_POSTGRESQL_URL=       # the postgresql url
# CLOUDRON_POSTGRESQL_USERNAME=  # username
# CLOUDRON_POSTGRESQL_PASSWORD=  # password
# CLOUDRON_POSTGRESQL_HOST=      # server name
# CLOUDRON_POSTGRESQL_PORT=      # server port
# CLOUDRON_POSTGRESQL_DATABASE=  # database name
# 
### REDIS
# CLOUDRON_REDIS_URL=            # the redis url
# CLOUDRON_REDIS_HOST=           # server name
# CLOUDRON_REDIS_PORT=           # server port
# CLOUDRON_REDIS_PASSWORD=       # password

set -eu

# ensure that data directory is owned by 'cloudron' user
chown -R cloudron:cloudron /app/data

# For production point these at your databases, in development the default
# should work out of the box.
export DATABASE_URL=$CLOUDRON_POSTGRESQL_URL
# export DATABASE_URL_TEST=postgres://user:pass@localhost:5532/outline-test

# Uncomment this to disable SSL for connecting to Postgres
# PGSSLMODE=disable
export REDIS_URL=$CLOUDRON_REDIS_URL

cd /app/code

echo "Running migrations"
( exec yarn db:migrate --env=production-ssl-disabled )

echo "Starting Outline app"

# run the app as user 'cloudron'
exec /usr/local/bin/gosu cloudron:cloudron node /app/code/build/server/index.js

