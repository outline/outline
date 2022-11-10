ARG APP_PATH=/opt/outline
FROM 289925803667.dkr.ecr.us-east-1.amazonaws.com/outline-nonprod-base-image:outline-base-image0.1 as base

ARG APP_PATH
WORKDIR $APP_PATH

# ---
FROM node:16.14.2-alpine3.15 AS runner

ARG APP_PATH
WORKDIR $APP_PATH
ENV NODE_ENV production

COPY --from=base $APP_PATH/build ./build
COPY --from=base $APP_PATH/server ./server

COPY server/emails/templates/components/Footer.tsx ./server/emails/templates/components/Footer.tsx
COPY server/emails/templates/WelcomeEmail.tsx ./server/emails/templates/WelcomeEmail.tsx
COPY server/emails/templates/InviteEmail.tsx ./server/emails/templates/InviteEmail.tsx

COPY --from=base $APP_PATH/public ./public
COPY --from=base $APP_PATH/.sequelizerc ./.sequelizerc
COPY --from=base $APP_PATH/node_modules ./node_modules
COPY --from=base $APP_PATH/package.json ./package.json

RUN addgroup -g 1001 -S nodejs && \
  adduser -S nodejs -u 1001 && \
  chown -R nodejs:nodejs $APP_PATH/build && \
  chown -R nodejs:nodejs $APP_PATH/server

USER nodejs

EXPOSE 3000
CMD ["yarn", "start"]
