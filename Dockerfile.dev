FROM node:14-alpine

WORKDIR /opt/outline

COPY ./package.json ./yarn.lock ./

RUN yarn install --no-optional --frozen-lockfile && yarn cache clean

COPY . .

USER root
