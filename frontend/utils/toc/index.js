// @flow
/* eslint-disable */

/**
 * marked-toc <https://github.com/jonschlinkert/marked-toc>
 *
 * Copyright (c) 2014 Jon Schlinkert, contributors.
 * Licensed under the MIT license.
 */

'use strict';

var marked = require('marked');
var _ = require('lodash');
var utils = require('./utils');

/**
 * Expose `toc`
 */

module.exports = toc;

/**
 * Default template to use for generating
 * a table of contents.
 */

var defaultTemplate =
  '<%= depth %><%= bullet %>[<%= heading %>](#<%= url %>)\n';

/**
 * Create the table of contents object that
 * will be used as context for the template.
 *
 * @param  {String} `str`
 * @param  {Object} `options`
 * @return {Object}
 */

function generate(str, options) {
  var opts = _.extend(
    {
      firsth1: false,
      blacklist: true,
      omit: [],
      maxDepth: 3,
      slugify: function(text) {
        return text; // Override this!
      },
    },
    options
  );

  var toc = '';
  // $FlowIssue invalid flow-typed
  var tokens = marked.lexer(str);
  var tocArray = [];

  // Remove the very first h1, true by default
  if (opts.firsth1 === false) {
    tokens.shift();
  }

  // Do any h1's still exist?
  var h1 = _.some(tokens, { depth: 1 });

  tokens
    .filter(function(token) {
      // Filter out everything but headings
      if (token.type !== 'heading' || token.type === 'code') {
        return false;
      }

      // Since we removed the first h1, we'll check to see if other h1's
      // exist. If none exist, then we unindent the rest of the TOC
      if (!h1) {
        token.depth = token.depth - 1;
      }

      // Store original text and create an id for linking
      token.heading = opts.strip ? utils.strip(token.text, opts) : token.text;

      // Create a "slugified" id for linking
      token.id = opts.slugify(token.text);

      // Omit headings with these strings
      var omissions = ['Table of Contents', 'TOC', 'TABLE OF CONTENTS'];
      var omit = _.union([], opts.omit, omissions);

      if (utils.isMatch(omit, token.heading)) {
        return;
      }

      return true;
    })
    .forEach(function(h) {
      if (h.depth > opts.maxDepth) {
        return;
      }

      var bullet = Array.isArray(opts.bullet)
        ? opts.bullet[(h.depth - 1) % opts.bullet.length]
        : opts.bullet;

      var data = _.extend({}, opts.data, {
        depth: new Array((h.depth - 1) * 2 + 1).join(' '),
        bullet: bullet ? bullet : '* ',
        heading: h.heading,
        url: h.id,
      });

      tocArray.push(data);
      toc += _.template(opts.template || defaultTemplate)(data);
    });

  return {
    data: tocArray,
    toc: opts.strip ? utils.strip(toc, opts) : toc,
  };
}

/**
 * toc
 */

function toc(str: string, options: Object) {
  return generate(str, options).toc;
}

toc.raw = function(str, options) {
  return generate(str, options);
};

toc.insert = function(content, options) {
  var start = '<!-- toc -->';
  var stop = '<!-- tocstop -->';
  var re = /<!-- toc -->([\s\S]+?)<!-- tocstop -->/;

  // remove the existing TOC
  content = content.replace(re, start);

  // generate new TOC
  var newtoc =
    '\n\n' + start + '\n\n' + toc(content, options) + '\n' + stop + '\n';

  // If front-matter existed, put it back
  return content.replace(start, newtoc);
};
