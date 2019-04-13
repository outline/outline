// @flow
require('./init');

if (process.env.NODE_ENV === 'production') {
  console.log(
    '\n\x1b[33m%s\x1b[0m',
    'Running Outline in production mode. Use `yarn dev` to run in development with live code reloading'
  );
} else if (process.env.NODE_ENV === 'development') {
  console.log(
    '\n\x1b[33m%s\x1b[0m',
    'Running Outline in development mode with hot reloading. To run Outline in production mode, use `yarn start`'
  );
}

if (
  !process.env.SECRET_KEY ||
  process.env.SECRET_KEY ===
    'F0E5AD933D7F6FD8F4DBB3E038C501C052DC0593C686D21ACB30AE205D2F634B'
) {
  console.error(
    'Please set SECRET_KEY env variable with output of `openssl rand -hex 32`'
  );
  // $FlowFixMe
  process.exit(1);
}

require('./server');
