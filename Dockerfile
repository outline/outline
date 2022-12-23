ARG APP_PATH=/opt/outline
FROM 419667429555.dkr.ecr.us-east-1.amazonaws.com/outline:base-3.15 as base

ARG APP_PATH
WORKDIR $APP_PATH

# ---
FROM node:16.14.2-alpine3.15 AS runner

# PostgreSQL
ARG BASE_URL
ARG DATABASE_URL 
ARG SECRET_KEY
ENV BASE_URL=$BASE_URL
ENV DATABASE_URL=$DATABASE_URL
ENV SECRET_KEY=$SECRET_KEY

# S3 Bucket
ARG S3_AWS_KEY_ID
ARG S3_AWS_SECRET_ACCESS_KEY 
ARG S3_AWS_BUCKET
ENV S3_AWS_KEY_ID=$S3_AWS_KEY_ID
ENV S3_AWS_SECRET_ACCESS_KEY=$S3_AWS_SECRET_ACCESS_KEY
ENV S3_AWS_BUCKET=$S3_AWS_BUCKET

# Redis Cluster
ARG GITHUB_TOKEN
ENV GITHUB_TOKEN=$GITHUB_TOKEN


ARG APP_PATH
WORKDIR $APP_PATH
ENV NODE_ENV production

COPY --from=base $APP_PATH/build ./build
COPY --from=base $APP_PATH/server ./server
COPY --from=base $APP_PATH/public ./public
COPY --from=base $APP_PATH/.sequelizerc ./.sequelizerc
COPY --from=base $APP_PATH/node_modules ./node_modules
COPY --from=base $APP_PATH/package.json ./package.json

RUN addgroup -g 1001 -S nodejs && \
  adduser -S nodejs -u 1001 && \
  chown -R nodejs:nodejs $APP_PATH/build

USER nodejs

EXPOSE 3000
CMD ["yarn", "start"]
