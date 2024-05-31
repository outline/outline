#!/bin/bash
# This is a script used by the devcontainer to build the project

yarn install-local-ssl
yarn install --pure-lockfile


cp .env.sample .env