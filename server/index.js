// @flow
import compress from 'koa-compress';
import { contentSecurityPolicy } from 'koa-helmet';
import logger from 'koa-logger';
import mount from 'koa-mount';
import enforceHttps from 'koa-sslify';
import Koa from 'koa';
import bugsnag from 'bugsnag';
import onerror from 'koa-onerror';
import updates from './utils/updates';

import auth from './auth';
import api from './api';
import emails from './emails';
import routes from './routes';

const app = new Koa();

app.use(compress());

if (process.env.NODE_ENV === 'development') {
  /* eslint-disable global-require */
  const convert = require('koa-convert');
  const webpack = require('webpack');
  const devMiddleware = require('koa-webpack-dev-middleware');
  const hotMiddleware = require('koa-webpack-hot-middleware');
  const config = require('../webpack.config.dev');
  const compile = webpack(config);
  /* eslint-enable global-require */

  app.use(
    convert(
      devMiddleware(compile, {
        // display no info to console (only warnings and errors)
        noInfo: true,

        // display nothing to the console
        quiet: false,

        // switch into lazy mode
        // that means no watching, but recompilation on every request
        lazy: false,

        // // watch options (only lazy: false)
        // watchOptions: {
        //   aggregateTimeout: 300,
        //   poll: true
        // },

        // public path to bind the middleware to
        // use the same as in webpack
        publicPath: config.output.publicPath,

        // options for formatting the statistics
        stats: {
          colors: true,
        },
      })
    )
  );
  app.use(
    convert(
      hotMiddleware(compile, {
        log: console.log, // eslint-disable-line
        path: '/__webpack_hmr',
        heartbeat: 10 * 1000,
      })
    )
  );
  app.use(logger());

  app.use(mount('/emails', emails));
} else if (process.env.NODE_ENV === 'production') {
  // Force HTTPS on all pages
  app.use(
    enforceHttps({
      trustProtoHeader: true,
    })
  );

  // trust header fields set by our proxy. eg X-Forwarded-For
  app.proxy = true;

  // catch errors in one place, automatically set status and response headers
  onerror(app);

  if (process.env.BUGSNAG_KEY) {
    bugsnag.register(process.env.BUGSNAG_KEY, {
      filters: ['authorization'],
    });
    app.on('error', bugsnag.koaHandler);
  }
}

app.use(mount('/auth', auth));
app.use(mount('/api', api));
app.use(mount(routes));

app.use(
  contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  })
);

/**
 * Production updates and anonymous analytics.
 *
 * Set ENABLE_UPDATES=false to disable them for your installation
 */
if (
  process.env.ENABLE_UPDATES !== 'false' &&
  process.env.NODE_ENV === 'production'
) {
  updates();
  setInterval(updates, 24 * 3600 * 1000);
}

export default app;
