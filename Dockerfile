FROM node:8.11

ENV APP_PATH /opt/outline
RUN mkdir -p $APP_PATH

WORKDIR $APP_PATH
COPY . $APP_PATH
RUN yarn
RUN cp -r /opt/outline/node_modules /opt/node_modules

