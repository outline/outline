# syntax=docker/dockerfile:1.2
FROM node:14-alpine AS deps-common

ARG APP_PATH /opt/outline
WORKDIR $APP_PATH
COPY ./package.json ./yarn.lock ./

# ---
FROM deps-common AS deps-dev
RUN yarn install --no-optional --frozen-lockfile && \
  yarn cache clean

# ---
FROM deps-common AS deps-prod
RUN yarn install --production=true --frozen-lockfile && \
  yarn cache clean

# ---
FROM node:14-alpine AS builder
WORKDIR $APP_PATH

COPY . .
COPY --from=deps-dev $APP_PATH/node_modules ./node_modules
RUN yarn build

# ---
FROM node:14-alpine AS runner

WORKDIR $APP_PATH
ENV NODE_ENV production

COPY --from=builder $APP_PATH/build ./build
COPY --from=builder $APP_PATH/server ./server
COPY --from=builder $APP_PATH/.sequelizerc ./.sequelizerc
COPY --from=deps-prod $APP_PATH/node_modules ./node_modules
COPY --from=builder $APP_PATH/package.json ./package.json

RUN addgroup -g 1001 -S nodejs && \
  adduser -S nodejs -u 1001 && \
  chown -R nodejs:nodejs $APP_PATH/build

USER nodejs

EXPOSE 3000
CMD ["yarn", "start"]
