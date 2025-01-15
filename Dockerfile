FROM node:20-slim AS base

ARG APP_PATH=/opt/outline

# Install wget to healthcheck the server
RUN  apt-get update \
  && apt-get install -y wget \
  && rm -rf /var/lib/apt/lists/*

# Create a non-root user compatible with Debian and BusyBox based images
RUN addgroup --gid 1001 nodejs && \
  adduser --uid 1001 --ingroup nodejs nodejs && \
  mkdir -p $APP_PATH && \
  chown -R nodejs:nodejs $APP_PATH && \
  mkdir -p /var/lib/outline && \
  chown -R nodejs:nodejs /var/lib/outline

ENV FILE_STORAGE_LOCAL_ROOT_DIR=/var/lib/outline/data
RUN mkdir -p "$FILE_STORAGE_LOCAL_ROOT_DIR" && \
  chown -R nodejs:nodejs "$FILE_STORAGE_LOCAL_ROOT_DIR" && \
  chmod 1777 "$FILE_STORAGE_LOCAL_ROOT_DIR"

# Perform subsequent operations as our new user
USER nodejs
WORKDIR $APP_PATH

COPY --chown=nodejs:nodejs ./package.json ./yarn.lock .
COPY --chown=nodejs:nodejs ./patches ./patches

# Install production dependencies into the base layers
RUN yarn install --production=true --network-timeout 1000000 && \
  yarn cache clean

FROM base AS build

# Build client and server with dev-dependencies
RUN yarn install --no-optional --frozen-lockfile --network-timeout 1000000 && \
  yarn cache clean

COPY --chown=nodejs:nodejs . .
ARG CDN_URL
RUN yarn build

# Inherit from the previous base image to regain access to the install modules
# and other image configuration
FROM base

LABEL org.opencontainers.image.source="https://github.com/outline/outline"

# Copy build artifacts into the base image
COPY --from=build $APP_PATH/build ./build
COPY --from=build $APP_PATH/server ./server
COPY --from=build $APP_PATH/public ./public
COPY --from=build $APP_PATH/.sequelizerc ./.sequelizerc

ENV NODE_ENV=production

ENV PORT=3000

VOLUME /var/lib/outline/data

HEALTHCHECK --interval=1m CMD wget -qO- "http://localhost:${PORT:-3000}/_health" | grep -q "OK" || exit 1

EXPOSE 3000
CMD ["yarn", "start"]
