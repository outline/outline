FROM cloudron/base:3.0.0@sha256:455c70428723e3a823198c57472785437eb6eab082e79b3ff04ea584faf46e92

ENV APP_PATH /app/code
RUN mkdir -p $APP_PATH

WORKDIR $APP_PATH

COPY package.json ./
COPY yarn.lock ./

RUN yarn --pure-lockfile

COPY . .

RUN yarn build && \
  yarn --production --ignore-scripts --prefer-offline && \
  rm -rf shared && \
  rm -rf app

ENV NODE_ENV production
CMD cloudron/start.sh

EXPOSE 3000
