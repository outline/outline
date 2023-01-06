#!/usr/bin/env bash

yarn babel --extensions .ts,.tsx --quiet -d ./build/server ./server
yarn babel --extensions .ts,.tsx --quiet -d ./build/shared ./shared

# Copy static files
cp ./server/collaboration/Procfile ./build/server/collaboration/Procfile
cp package.json ./build
cp ./server/static/error.dev.html ./build/server/error.dev.html
cp ./server/static/error.prod.html ./build/server/error.prod.html

# Link webpack config
ln -sf "$(pwd)/webpack.config.dev.js" ./build
