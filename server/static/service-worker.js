/* eslint-disable */

/*
  Copyright 2014 Google Inc. All Rights Reserved.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

(function(f) {
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    module.exports = f();
  } else if (typeof define === 'function' && define.amd) {
    define([], f);
  } else {
    var g;
    if (typeof window !== 'undefined') {
      g = window;
    } else if (typeof global !== 'undefined') {
      g = global;
    } else if (typeof self !== 'undefined') {
      g = self;
    } else {
      g = this;
    }
    g.toolbox = f();
  }
})(function() {
  var define, module, exports;
  return (function e(t, n, r) {
    function s(o, u) {
      if (!n[o]) {
        if (!t[o]) {
          var a = typeof require == 'function' && require;
          if (!u && a) return a(o, !0);
          if (i) return i(o, !0);
          var f = new Error("Cannot find module '" + o + "'");
          throw ((f.code = 'MODULE_NOT_FOUND'), f);
        }
        var l = (n[o] = { exports: {} });
        t[o][0].call(
          l.exports,
          function(e) {
            var n = t[o][1][e];
            return s(n ? n : e);
          },
          l,
          l.exports,
          e,
          t,
          n,
          r
        );
      }
      return n[o].exports;
    }
    var i = typeof require == 'function' && require;
    for (var o = 0; o < r.length; o++) s(r[o]);
    return s;
  })(
    {
      1: [
        function(require, module, exports) {
          'use strict';
          function debug(e, n) {
            n = n || {};
            var t = n.debug || globalOptions.debug;
            t && console.log('[sw-toolbox] ' + e);
          }
          function openCache(e) {
            var n;
            return e && e.cache && (n = e.cache.name), (n =
              n || globalOptions.cache.name), caches.open(n);
          }
          function fetchAndCache(e, n) {
            n = n || {};
            var t = n.successResponses || globalOptions.successResponses;
            return fetch(e.clone()).then(function(c) {
              return 'GET' === e.method &&
                t.test(c.status) &&
                openCache(n).then(function(t) {
                  t.put(e, c).then(function() {
                    var c = n.cache || globalOptions.cache;
                    (c.maxEntries || c.maxAgeSeconds) &&
                      c.name &&
                      queueCacheExpiration(e, t, c);
                  });
                }), c.clone();
            });
          }
          function queueCacheExpiration(e, n, t) {
            var c = cleanupCache.bind(null, e, n, t);
            cleanupQueue = cleanupQueue ? cleanupQueue.then(c) : c();
          }
          function cleanupCache(e, n, t) {
            var c = e.url,
              a = t.maxAgeSeconds,
              u = t.maxEntries,
              o = t.name,
              r = Date.now();
            return debug(
              'Updating LRU order for ' +
                c +
                '. Max entries is ' +
                u +
                ', max age is ' +
                a
            ), idbCacheExpiration
              .getDb(o)
              .then(function(e) {
                return idbCacheExpiration.setTimestampForUrl(e, c, r);
              })
              .then(function(e) {
                return idbCacheExpiration.expireEntries(e, u, a, r);
              })
              .then(function(e) {
                debug('Successfully updated IDB.');
                var t = e.map(function(e) {
                  return n['delete'](e);
                });
                return Promise.all(t).then(function() {
                  debug('Done with cache cleanup.');
                });
              })['catch'](function(e) {
                debug(e);
              });
          }
          function renameCache(e, n, t) {
            return debug(
              'Renaming cache: [' + e + '] to [' + n + ']',
              t
            ), caches['delete'](n).then(function() {
              return Promise.all([
                caches.open(e),
                caches.open(n),
              ]).then(function(n) {
                var t = n[0], c = n[1];
                return t
                  .keys()
                  .then(function(e) {
                    return Promise.all(
                      e.map(function(e) {
                        return t.match(e).then(function(n) {
                          return c.put(e, n);
                        });
                      })
                    );
                  })
                  .then(function() {
                    return caches['delete'](e);
                  });
              });
            });
          }
          var globalOptions = require('./options'),
            idbCacheExpiration = require('./idb-cache-expiration'),
            cleanupQueue;
          module.exports = {
            debug: debug,
            fetchAndCache: fetchAndCache,
            openCache: openCache,
            renameCache: renameCache,
          };
        },
        { './idb-cache-expiration': 2, './options': 3 },
      ],
      2: [
        function(require, module, exports) {
          'use strict';
          function openDb(e) {
            return new Promise(function(r, n) {
              var t = indexedDB.open(DB_PREFIX + e, DB_VERSION);
              (t.onupgradeneeded = function() {
                var e = t.result.createObjectStore(STORE_NAME, {
                  keyPath: URL_PROPERTY,
                });
                e.createIndex(TIMESTAMP_PROPERTY, TIMESTAMP_PROPERTY, {
                  unique: !1,
                });
              }), (t.onsuccess = function() {
                r(t.result);
              }), (t.onerror = function() {
                n(t.error);
              });
            });
          }
          function getDb(e) {
            return e in cacheNameToDbPromise ||
              (cacheNameToDbPromise[e] = openDb(e)), cacheNameToDbPromise[e];
          }
          function setTimestampForUrl(e, r, n) {
            return new Promise(function(t, o) {
              var i = e.transaction(STORE_NAME, 'readwrite'),
                u = i.objectStore(STORE_NAME);
              u.put({ url: r, timestamp: n }), (i.oncomplete = function() {
                t(e);
              }), (i.onabort = function() {
                o(i.error);
              });
            });
          }
          function expireOldEntries(e, r, n) {
            return r
              ? new Promise(function(t, o) {
                  var i = 1e3 * r,
                    u = [],
                    c = e.transaction(STORE_NAME, 'readwrite'),
                    s = c.objectStore(STORE_NAME),
                    a = s.index(TIMESTAMP_PROPERTY);
                  (a.openCursor().onsuccess = function(e) {
                    var r = e.target.result;
                    if (r && n - i > r.value[TIMESTAMP_PROPERTY]) {
                      var t = r.value[URL_PROPERTY];
                      u.push(t), s['delete'](t), r['continue']();
                    }
                  }), (c.oncomplete = function() {
                    t(u);
                  }), (c.onabort = o);
                })
              : Promise.resolve([]);
          }
          function expireExtraEntries(e, r) {
            return r
              ? new Promise(function(n, t) {
                  var o = [],
                    i = e.transaction(STORE_NAME, 'readwrite'),
                    u = i.objectStore(STORE_NAME),
                    c = u.index(TIMESTAMP_PROPERTY),
                    s = c.count();
                  (c.count().onsuccess = function() {
                    var e = s.result;
                    e > r &&
                      (c.openCursor().onsuccess = function(n) {
                        var t = n.target.result;
                        if (t) {
                          var i = t.value[URL_PROPERTY];
                          o.push(i), u['delete'](i), e - o.length > r &&
                            t['continue']();
                        }
                      });
                  }), (i.oncomplete = function() {
                    n(o);
                  }), (i.onabort = t);
                })
              : Promise.resolve([]);
          }
          function expireEntries(e, r, n, t) {
            return expireOldEntries(e, n, t).then(function(n) {
              return expireExtraEntries(e, r).then(function(e) {
                return n.concat(e);
              });
            });
          }
          var DB_PREFIX = 'sw-toolbox-',
            DB_VERSION = 1,
            STORE_NAME = 'store',
            URL_PROPERTY = 'url',
            TIMESTAMP_PROPERTY = 'timestamp',
            cacheNameToDbPromise = {};
          module.exports = {
            getDb: getDb,
            setTimestampForUrl: setTimestampForUrl,
            expireEntries: expireEntries,
          };
        },
        {},
      ],
      3: [
        function(require, module, exports) {
          'use strict';
          var scope;
          (scope = self.registration
            ? self.registration.scope
            : self.scope ||
                new URL('./', self.location).href), (module.exports = {
            cache: {
              name: '$$$toolbox-cache$$$' + scope + '$$$',
              maxAgeSeconds: null,
              maxEntries: null,
            },
            debug: !1,
            networkTimeoutSeconds: null,
            preCacheItems: [],
            successResponses: /^0|([123]\d\d)|(40[14567])|410$/,
          });
        },
        {},
      ],
      4: [
        function(require, module, exports) {
          'use strict';
          var url = new URL('./', self.location),
            basePath = url.pathname,
            pathRegexp = require('path-to-regexp'),
            Route = function(e, t, i, s) {
              t instanceof RegExp
                ? (this.fullUrlRegExp = t)
                : (0 !== t.indexOf('/') && (t = basePath + t), (this.keys = [
                  ]), (this.regexp = pathRegexp(
                    t,
                    this.keys
                  ))), (this.method = e), (this.options = s), (this.handler = i);
            };
          (Route.prototype.makeHandler = function(e) {
            var t;
            if (this.regexp) {
              var i = this.regexp.exec(e);
              (t = {}), this.keys.forEach(function(e, s) {
                t[e.name] = i[s + 1];
              });
            }
            return function(e) {
              return this.handler(e, t, this.options);
            }.bind(this);
          }), (module.exports = Route);
        },
        { 'path-to-regexp': 13 },
      ],
      5: [
        function(require, module, exports) {
          'use strict';
          function regexEscape(e) {
            return e.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
          }
          var Route = require('./route'),
            keyMatch = function(e, t) {
              for (var r = e.entries(), o = r.next(); !o.done; ) {
                var n = new RegExp(o.value[0]);
                if (n.test(t)) return o.value[1];
                o = r.next();
              }
              return null;
            },
            Router = function() {
              (this.routes = new Map()), (this['default'] = null);
            };
          ['get', 'post', 'put', 'delete', 'head', 'any'].forEach(function(e) {
            Router.prototype[e] = function(t, r, o) {
              return this.add(e, t, r, o);
            };
          }), (Router.prototype.add = function(e, t, r, o) {
            o = o || {};
            var n;
            t instanceof RegExp
              ? (n = RegExp)
              : ((n = o.origin || self.location.origin), (n = n instanceof
                  RegExp
                  ? n.source
                  : regexEscape(n))), (e = e.toLowerCase());
            var u = new Route(e, t, r, o);
            this.routes.has(n) || this.routes.set(n, new Map());
            var a = this.routes.get(n);
            a.has(e) || a.set(e, new Map());
            var s = a.get(e), i = u.regexp || u.fullUrlRegExp;
            s.set(i.source, u);
          }), (Router.prototype.matchMethod = function(e, t) {
            var r = new URL(t), o = r.origin, n = r.pathname;
            return (
              this._match(e, keyMatch(this.routes, o), n) ||
              this._match(e, this.routes.get(RegExp), t)
            );
          }), (Router.prototype._match = function(e, t, r) {
            if (t) {
              var o = t.get(e.toLowerCase());
              if (o) {
                var n = keyMatch(o, r);
                if (n) return n.makeHandler(r);
              }
            }
            return null;
          }), (Router.prototype.match = function(e) {
            return (
              this.matchMethod(e.method, e.url) ||
              this.matchMethod('any', e.url)
            );
          }), (module.exports = new Router());
        },
        { './route': 4 },
      ],
      6: [
        function(require, module, exports) {
          'use strict';
          function cacheFirst(e, r, t) {
            return helpers.debug(
              'Strategy: cache first [' + e.url + ']',
              t
            ), helpers.openCache(t).then(function(r) {
              return r.match(e).then(function(r) {
                return r ? r : helpers.fetchAndCache(e, t);
              });
            });
          }
          var helpers = require('../helpers');
          module.exports = cacheFirst;
        },
        { '../helpers': 1 },
      ],
      7: [
        function(require, module, exports) {
          'use strict';
          function cacheOnly(e, r, c) {
            return helpers.debug(
              'Strategy: cache only [' + e.url + ']',
              c
            ), helpers.openCache(c).then(function(r) {
              return r.match(e);
            });
          }
          var helpers = require('../helpers');
          module.exports = cacheOnly;
        },
        { '../helpers': 1 },
      ],
      8: [
        function(require, module, exports) {
          'use strict';
          function fastest(e, n, t) {
            return helpers.debug(
              'Strategy: fastest [' + e.url + ']',
              t
            ), new Promise(function(r, s) {
              var c = !1,
                o = [],
                a = function(e) {
                  o.push(e.toString()), c
                    ? s(
                        new Error(
                          'Both cache and network failed: "' +
                            o.join('", "') +
                            '"'
                        )
                      )
                    : (c = !0);
                },
                h = function(e) {
                  e instanceof Response ? r(e) : a('No result returned');
                };
              helpers
                .fetchAndCache(e.clone(), t)
                .then(h, a), cacheOnly(e, n, t).then(h, a);
            });
          }
          var helpers = require('../helpers'),
            cacheOnly = require('./cacheOnly');
          module.exports = fastest;
        },
        { '../helpers': 1, './cacheOnly': 7 },
      ],
      9: [
        function(require, module, exports) {
          module.exports = {
            networkOnly: require('./networkOnly'),
            networkFirst: require('./networkFirst'),
            cacheOnly: require('./cacheOnly'),
            cacheFirst: require('./cacheFirst'),
            fastest: require('./fastest'),
          };
        },
        {
          './cacheFirst': 6,
          './cacheOnly': 7,
          './fastest': 8,
          './networkFirst': 10,
          './networkOnly': 11,
        },
      ],
      10: [
        function(require, module, exports) {
          'use strict';
          function networkFirst(e, r, t) {
            t = t || {};
            var s = t.successResponses || globalOptions.successResponses,
              n =
                t.networkTimeoutSeconds || globalOptions.networkTimeoutSeconds;
            return helpers.debug(
              'Strategy: network first [' + e.url + ']',
              t
            ), helpers.openCache(t).then(function(r) {
              var o, u, c = [];
              if (n) {
                var i = new Promise(function(t) {
                  o = setTimeout(function() {
                    r.match(e).then(function(e) {
                      e && t(e);
                    });
                  }, 1e3 * n);
                });
                c.push(i);
              }
              var a = helpers.fetchAndCache(e, t).then(function(e) {
                if ((o && clearTimeout(o), s.test(e.status))) return e;
                throw (helpers.debug(
                  'Response was an HTTP error: ' + e.statusText,
                  t
                ), (u = e), new Error('Bad response'));
              })['catch'](function() {
                return helpers.debug(
                  'Network or response error, fallback to cache [' +
                    e.url +
                    ']',
                  t
                ), r.match(e).then(function(e) {
                  return e || u;
                });
              });
              return c.push(a), Promise.race(c);
            });
          }
          var globalOptions = require('../options'),
            helpers = require('../helpers');
          module.exports = networkFirst;
        },
        { '../helpers': 1, '../options': 3 },
      ],
      11: [
        function(require, module, exports) {
          'use strict';
          function networkOnly(e, r, t) {
            return helpers.debug(
              'Strategy: network only [' + e.url + ']',
              t
            ), fetch(e);
          }
          var helpers = require('../helpers');
          module.exports = networkOnly;
        },
        { '../helpers': 1 },
      ],
      12: [
        function(require, module, exports) {
          'use strict';
          function cache(e, t) {
            return helpers.openCache(t).then(function(t) {
              return t.add(e);
            });
          }
          function uncache(e, t) {
            return helpers.openCache(t).then(function(t) {
              return t['delete'](e);
            });
          }
          function precache(e) {
            Array.isArray(e) ||
              (e = [e]), (options.preCacheItems = options.preCacheItems.concat(
              e
            ));
          }
          require('serviceworker-cache-polyfill');
          var options = require('./options'),
            router = require('./router'),
            helpers = require('./helpers'),
            strategies = require('./strategies');
          helpers.debug('Service Worker Toolbox is loading');
          var flatten = function(e) {
            return e.reduce(function(e, t) {
              return e.concat(t);
            }, []);
          };
          self.addEventListener('install', function(e) {
            var t = options.cache.name + '$$$inactive$$$';
            helpers.debug(
              'install event fired'
            ), helpers.debug('creating cache [' + t + ']'), e.waitUntil(
              helpers.openCache({ cache: { name: t } }).then(function(e) {
                return Promise.all(options.preCacheItems)
                  .then(flatten)
                  .then(function(t) {
                    return helpers.debug(
                      'preCache list: ' + (t.join(', ') || '(none)')
                    ), e.addAll(t);
                  });
              })
            );
          }), self.addEventListener('activate', function(e) {
            helpers.debug('activate event fired');
            var t = options.cache.name + '$$$inactive$$$';
            e.waitUntil(helpers.renameCache(t, options.cache.name));
          }), self.addEventListener('fetch', function(e) {
            var t = router.match(e.request);
            t
              ? e.respondWith(t(e.request))
              : router['default'] &&
                  'GET' === e.request.method &&
                  e.respondWith(router['default'](e.request));
          }), (module.exports = {
            networkOnly: strategies.networkOnly,
            networkFirst: strategies.networkFirst,
            cacheOnly: strategies.cacheOnly,
            cacheFirst: strategies.cacheFirst,
            fastest: strategies.fastest,
            router: router,
            options: options,
            cache: cache,
            uncache: uncache,
            precache: precache,
          });
        },
        {
          './helpers': 1,
          './options': 3,
          './router': 5,
          './strategies': 9,
          'serviceworker-cache-polyfill': 15,
        },
      ],
      13: [
        function(require, module, exports) {
          function parse(e) {
            for (
              var t, r = [], n = 0, o = 0, p = '';
              null != (t = PATH_REGEXP.exec(e));

            ) {
              var a = t[0], i = t[1], s = t.index;
              if (((p += e.slice(o, s)), (o = s + a.length), i)) p += i[1];
              else {
                p && (r.push(p), (p = ''));
                var u = t[2],
                  c = t[3],
                  l = t[4],
                  f = t[5],
                  g = t[6],
                  x = t[7],
                  h = '+' === g || '*' === g,
                  m = '?' === g || '*' === g,
                  y = u || '/',
                  T = l || f || (x ? '.*' : '[^' + y + ']+?');
                r.push({
                  name: c || n++,
                  prefix: u || '',
                  delimiter: y,
                  optional: m,
                  repeat: h,
                  pattern: escapeGroup(T),
                });
              }
            }
            return o < e.length && (p += e.substr(o)), p && r.push(p), r;
          }
          function compile(e) {
            return tokensToFunction(parse(e));
          }
          function tokensToFunction(e) {
            for (var t = new Array(e.length), r = 0; r < e.length; r++)
              'object' == typeof e[r] &&
                (t[r] = new RegExp('^' + e[r].pattern + '$'));
            return function(r) {
              for (var n = '', o = r || {}, p = 0; p < e.length; p++) {
                var a = e[p];
                if ('string' != typeof a) {
                  var i, s = o[a.name];
                  if (null == s) {
                    if (a.optional) continue;
                    throw new TypeError(
                      'Expected "' + a.name + '" to be defined'
                    );
                  }
                  if (isarray(s)) {
                    if (!a.repeat)
                      throw new TypeError(
                        'Expected "' +
                          a.name +
                          '" to not repeat, but received "' +
                          s +
                          '"'
                      );
                    if (0 === s.length) {
                      if (a.optional) continue;
                      throw new TypeError(
                        'Expected "' + a.name + '" to not be empty'
                      );
                    }
                    for (var u = 0; u < s.length; u++) {
                      if (((i = encodeURIComponent(s[u])), !t[p].test(i)))
                        throw new TypeError(
                          'Expected all "' +
                            a.name +
                            '" to match "' +
                            a.pattern +
                            '", but received "' +
                            i +
                            '"'
                        );
                      n += (0 === u ? a.prefix : a.delimiter) + i;
                    }
                  } else {
                    if (((i = encodeURIComponent(s)), !t[p].test(i)))
                      throw new TypeError(
                        'Expected "' +
                          a.name +
                          '" to match "' +
                          a.pattern +
                          '", but received "' +
                          i +
                          '"'
                      );
                    n += a.prefix + i;
                  }
                } else n += a;
              }
              return n;
            };
          }
          function escapeString(e) {
            return e.replace(/([.+*?=^!:${}()[\]|\/])/g, '\\$1');
          }
          function escapeGroup(e) {
            return e.replace(/([=!:$\/()])/g, '\\$1');
          }
          function attachKeys(e, t) {
            return (e.keys = t), e;
          }
          function flags(e) {
            return e.sensitive ? '' : 'i';
          }
          function regexpToRegexp(e, t) {
            var r = e.source.match(/\((?!\?)/g);
            if (r)
              for (var n = 0; n < r.length; n++)
                t.push({
                  name: n,
                  prefix: null,
                  delimiter: null,
                  optional: !1,
                  repeat: !1,
                  pattern: null,
                });
            return attachKeys(e, t);
          }
          function arrayToRegexp(e, t, r) {
            for (var n = [], o = 0; o < e.length; o++)
              n.push(pathToRegexp(e[o], t, r).source);
            var p = new RegExp('(?:' + n.join('|') + ')', flags(r));
            return attachKeys(p, t);
          }
          function stringToRegexp(e, t, r) {
            for (
              var n = parse(e), o = tokensToRegExp(n, r), p = 0;
              p < n.length;
              p++
            )
              'string' != typeof n[p] && t.push(n[p]);
            return attachKeys(o, t);
          }
          function tokensToRegExp(e, t) {
            t = t || {};
            for (
              var r = t.strict,
                n = t.end !== !1,
                o = '',
                p = e[e.length - 1],
                a = 'string' == typeof p && /\/$/.test(p),
                i = 0;
              i < e.length;
              i++
            ) {
              var s = e[i];
              if ('string' == typeof s) o += escapeString(s);
              else {
                var u = escapeString(s.prefix), c = s.pattern;
                s.repeat && (c += '(?:' + u + c + ')*'), (c = s.optional
                  ? u ? '(?:' + u + '(' + c + '))?' : '(' + c + ')?'
                  : u + '(' + c + ')'), (o += c);
              }
            }
            return r ||
              (o = (a ? o.slice(0, -2) : o) + '(?:\\/(?=$))?'), (o += n
              ? '$'
              : r && a ? '' : '(?=\\/|$)'), new RegExp('^' + o, flags(t));
          }
          function pathToRegexp(e, t, r) {
            return (t = t || []), isarray(t)
              ? r || (r = {})
              : ((r = t), (t = [])), e instanceof RegExp
              ? regexpToRegexp(e, t, r)
              : isarray(e) ? arrayToRegexp(e, t, r) : stringToRegexp(e, t, r);
          }
          var isarray = require('isarray');
          (module.exports = pathToRegexp), (module.exports.parse = parse), (module.exports.compile = compile), (module.exports.tokensToFunction = tokensToFunction), (module.exports.tokensToRegExp = tokensToRegExp);
          var PATH_REGEXP = new RegExp(
            [
              '(\\\\.)',
              '([\\/.])?(?:(?:\\:(\\w+)(?:\\(((?:\\\\.|[^()])+)\\))?|\\(((?:\\\\.|[^()])+)\\))([+*?])?|(\\*))',
            ].join('|'),
            'g'
          );
        },
        { isarray: 14 },
      ],
      14: [
        function(require, module, exports) {
          module.exports =
            Array.isArray ||
            function(r) {
              return '[object Array]' == Object.prototype.toString.call(r);
            };
        },
        {},
      ],
      15: [
        function(require, module, exports) {
          Cache.prototype.addAll ||
            (Cache.prototype.addAll = function(t) {
              function e(t) {
                (this.name =
                  'NetworkError'), (this.code = 19), (this.message = t);
              }
              var r = this;
              return (e.prototype = Object.create(
                Error.prototype
              )), Promise.resolve()
                .then(function() {
                  if (arguments.length < 1) throw new TypeError();
                  return (t = t.map(function(t) {
                    return t instanceof Request ? t : String(t);
                  })), Promise.all(
                    t.map(function(t) {
                      'string' == typeof t && (t = new Request(t));
                      var r = new URL(t.url).protocol;
                      if ('http:' !== r && 'https:' !== r)
                        throw new e('Invalid scheme');
                      return fetch(t.clone());
                    })
                  );
                })
                .then(function(e) {
                  return Promise.all(
                    e.map(function(e, n) {
                      return r.put(t[n], e);
                    })
                  );
                })
                .then(function() {});
            });
        },
        {},
      ],
    },
    {},
    [12]
  )(12);
});

(global => {
  'use strict';
  // Assets
  global.toolbox.router.get(/\/static\//, global.toolbox.cacheFirst, {
    cache: { name: 'static' },
  });
  global.toolbox.router.get('/(.*)', global.toolbox.fastest, {
    origin: 'https://secure.gravatar.com',
  });

  // API
  global.toolbox.router.get(/\/api\//, global.toolbox.networkFirst, {
    cache: {
      name: 'api',
      maxEntries: 100,
    },
  });

  // API GET calls
  global.toolbox.router.default = global.toolbox.networkFirst;

  // Boilerplate to ensure our service worker takes control of the page as soon
  // as possible.
  global.addEventListener('install', event =>
    event.waitUntil(global.skipWaiting())
  );
  global.addEventListener('activate', event =>
    event.waitUntil(global.clients.claim())
  );
})(self);
