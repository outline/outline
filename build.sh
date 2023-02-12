#!/bin/sh

# Compile server and shared
yarn concurrently "yarn babel --extensions .ts,.tsx --quiet -d ./build/server ./server" \
 "yarn babel --extensions .ts,.tsx --quiet -d ./build/shared ./shared"

# Compile code in packages
for d in ./plugins/*; do
  # Get the name of the folder
  package=$(basename "$d")
  yarn babel --extensions .ts,.tsx --quiet -d "./build/plugins/$package/server" "./plugins/$package/server"
  cp ./plugins/$package/plugin.json ./build/plugins/$package/plugin.json
done

# Copy static files
cp ./server/collaboration/Procfile ./build/server/collaboration/Procfile
cp package.json ./build
cp ./server/static/error.dev.html ./build/server/error.dev.html
cp ./server/static/error.prod.html ./build/server/error.prod.html

# Link webpack config
ln -sf "$(pwd)/webpack.config.dev.js" ./build
