require('safestart')(__dirname, {
  exclude: ['slate-markdown-serializer'],
});
require('babel-core/register');
require('babel-polyfill');
require('localenv');
