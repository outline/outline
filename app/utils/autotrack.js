/**
 * Vendored from https://github.com/googleanalytics/autotrack (v2.4.1)
 * and its dependency https://github.com/philipwalton/dom-utils (v0.9.0)
 *
 * Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0
 *
 * Only the three plugins used by Outline are included:
 * - eventTracker
 * - outboundLinkTracker
 * - urlChangeTracker
 *
 * The original libraries are no longer maintained.
 */

/* eslint-disable */

// ---------------------------------------------------------------------------
// dom-utils: matches
// ---------------------------------------------------------------------------

const nativeMatches =
  Element.prototype.matches || Element.prototype.webkitMatchesSelector;

function matchesSelector(element, selector) {
  if (typeof selector != "string") {
    return false;
  }
  if (nativeMatches) {
    return nativeMatches.call(element, selector);
  }
  const nodes = element.parentNode.querySelectorAll(selector);
  for (let i = 0, node; (node = nodes[i]); i++) {
    if (node == element) {
      return true;
    }
  }
  return false;
}

function matches(element, test) {
  if (element && element.nodeType == 1 && test) {
    if (typeof test == "string" || test.nodeType == 1) {
      return element == test || matchesSelector(element, test);
    } else if ("length" in test) {
      for (let i = 0, item; (item = test[i]); i++) {
        if (element == item || matchesSelector(element, item)) {
          return true;
        }
      }
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// dom-utils: parents
// ---------------------------------------------------------------------------

function parents(element) {
  const list = [];
  while (element && element.parentNode && element.parentNode.nodeType == 1) {
    element = element.parentNode;
    list.push(element);
  }
  return list;
}

// ---------------------------------------------------------------------------
// dom-utils: closest
// ---------------------------------------------------------------------------

function closest(element, selector, shouldCheckSelf = false) {
  if (!(element && element.nodeType == 1 && selector)) {
    return;
  }
  const parentElements = (shouldCheckSelf ? [element] : []).concat(
    parents(element)
  );
  for (let i = 0, parent; (parent = parentElements[i]); i++) {
    if (matches(parent, selector)) {
      return parent;
    }
  }
}

// ---------------------------------------------------------------------------
// dom-utils: delegate
// ---------------------------------------------------------------------------

function delegate(ancestor, eventType, selector, callback, opts = {}) {
  const listener = function (event) {
    let delegateTarget;

    if (opts.composed && typeof event.composedPath == "function") {
      const composedPath = event.composedPath();
      for (let i = 0, node; (node = composedPath[i]); i++) {
        if (node.nodeType == 1 && matches(node, selector)) {
          delegateTarget = node;
        }
      }
    } else {
      delegateTarget = closest(event.target, selector, true);
    }

    if (delegateTarget) {
      callback.call(delegateTarget, event, delegateTarget);
    }
  };

  ancestor.addEventListener(eventType, listener, opts.useCapture);

  return {
    destroy() {
      ancestor.removeEventListener(eventType, listener, opts.useCapture);
    },
  };
}

// ---------------------------------------------------------------------------
// dom-utils: parseUrl
// ---------------------------------------------------------------------------

const HTTP_PORT = "80";
const HTTPS_PORT = "443";
const DEFAULT_PORT = RegExp(":(" + HTTP_PORT + "|" + HTTPS_PORT + ")$");

const anchor = document.createElement("a");
const urlCache = {};

function parseUrl(url) {
  url = !url || url == "." ? location.href : url;

  if (urlCache[url]) {
    return urlCache[url];
  }

  anchor.href = url;

  if (url.charAt(0) == "." || url.charAt(0) == "/") {
    return parseUrl(anchor.href);
  }

  let port =
    anchor.port == HTTP_PORT || anchor.port == HTTPS_PORT ? "" : anchor.port;
  port = port == "0" ? "" : port;

  const host = anchor.host.replace(DEFAULT_PORT, "");
  const origin = anchor.origin ? anchor.origin : anchor.protocol + "//" + host;
  const pathname =
    anchor.pathname.charAt(0) == "/" ? anchor.pathname : "/" + anchor.pathname;

  return (urlCache[url] = {
    hash: anchor.hash,
    host,
    hostname: anchor.hostname,
    href: anchor.href,
    origin,
    pathname,
    port,
    protocol: anchor.protocol,
    search: anchor.search,
  });
}

// ---------------------------------------------------------------------------
// dom-utils: getAttributes
// ---------------------------------------------------------------------------

function getAttributes(element) {
  const attrs = {};
  if (!(element && element.nodeType == 1)) {
    return attrs;
  }
  const map = element.attributes;
  if (map.length === 0) {
    return {};
  }
  for (let i = 0, attr; (attr = map[i]); i++) {
    attrs[attr.name] = attr.value;
  }
  return attrs;
}

// ---------------------------------------------------------------------------
// autotrack: utilities
// ---------------------------------------------------------------------------

function camelCase(str) {
  return str.replace(/[-_]+(\w?)/g, function (_match, p1) {
    return p1.toUpperCase();
  });
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function createFieldsObj(
  defaultFields,
  userFields,
  tracker,
  hitFilter,
  target,
  event
) {
  if (typeof hitFilter == "function") {
    const originalBuildHitTask = tracker.get("buildHitTask");
    return {
      buildHitTask: (model) => {
        model.set(defaultFields, null, true);
        model.set(userFields, null, true);
        hitFilter(model, target, event);
        originalBuildHitTask(model);
      },
    };
  } else {
    return Object.assign({}, defaultFields, userFields);
  }
}

function getAttributeFields(element, prefix) {
  const attributes = getAttributes(element);
  const attributeFields = {};

  Object.keys(attributes).forEach(function (attribute) {
    if (attribute.indexOf(prefix) === 0 && attribute != prefix + "on") {
      let value = attributes[attribute];
      if (value == "true") {
        value = true;
      }
      if (value == "false") {
        value = false;
      }
      const field = camelCase(attribute.slice(prefix.length));
      attributeFields[field] = value;
    }
  });

  return attributeFields;
}

function withTimeout(callback, wait = 2000) {
  let called = false;
  const fn = function () {
    if (!called) {
      called = true;
      callback();
    }
  };
  setTimeout(fn, wait);
  return fn;
}

// ---------------------------------------------------------------------------
// autotrack: method-chain
// ---------------------------------------------------------------------------

const methodChainInstances = [];

function getOrCreateMethodChain(context, methodName) {
  let chain = methodChainInstances.filter(
    (h) => h.context == context && h.methodName == methodName
  )[0];

  if (!chain) {
    chain = createMethodChain(context, methodName);
    methodChainInstances.push(chain);
  }
  return chain;
}

function createMethodChain(context, methodName) {
  const isTask = /Task$/.test(methodName);
  const originalMethodReference = isTask
    ? context.get(methodName)
    : context[methodName];

  const instance = {
    context,
    methodName,
    isTask,
    originalMethodReference,
    methodChain: [],
    boundMethodChain: [],
    wrappedMethod(...args) {
      const lastBoundMethod =
        instance.boundMethodChain[instance.boundMethodChain.length - 1];
      return lastBoundMethod(...args);
    },
    add(overrideMethod) {
      this.methodChain.push(overrideMethod);
      this.rebindMethodChain();
    },
    remove(overrideMethod) {
      const index = this.methodChain.indexOf(overrideMethod);
      if (index > -1) {
        this.methodChain.splice(index, 1);
        if (this.methodChain.length > 0) {
          this.rebindMethodChain();
        } else {
          this.destroy();
        }
      }
    },
    rebindMethodChain() {
      this.boundMethodChain = [];
      for (let method, i = 0; (method = this.methodChain[i]); i++) {
        const previousMethod =
          this.boundMethodChain[i - 1] ||
          this.originalMethodReference.bind(this.context);
        this.boundMethodChain.push(method(previousMethod));
      }
    },
    destroy() {
      const index = methodChainInstances.indexOf(this);
      if (index > -1) {
        methodChainInstances.splice(index, 1);
        if (this.isTask) {
          this.context.set(this.methodName, this.originalMethodReference);
        } else {
          this.context[this.methodName] = this.originalMethodReference;
        }
      }
    },
  };

  if (isTask) {
    context.set(methodName, instance.wrappedMethod);
  } else {
    context[methodName] = instance.wrappedMethod;
  }

  return instance;
}

const MethodChain = {
  add(context, methodName, methodOverride) {
    getOrCreateMethodChain(context, methodName).add(methodOverride);
  },
  remove(context, methodName, methodOverride) {
    getOrCreateMethodChain(context, methodName).remove(methodOverride);
  },
};

// ---------------------------------------------------------------------------
// autotrack: usage tracking
// ---------------------------------------------------------------------------

const VERSION = "2.4.1";
const DEV_ID = "i5iSjo";
const VERSION_PARAM = "_av";
const USAGE_PARAM = "_au";

const pluginIds = {
  EVENT_TRACKER: 2,
  OUTBOUND_LINK_TRACKER: 6,
  URL_CHANGE_TRACKER: 9,
};

const PLUGIN_COUNT = 10;

function convertHexToBin(hex) {
  return parseInt(hex || "0", 16).toString(2);
}

function convertBinToHex(bin) {
  return parseInt(bin || "0", 2).toString(16);
}

function padZeros(str, len) {
  while (str.length < len) {
    str = "0" + str;
  }
  return str;
}

function flipBitOn(str, index) {
  return str.substr(0, index) + 1 + str.substr(index + 1);
}

function trackPlugin(tracker, pluginIndex) {
  const usageHex = tracker.get("&" + USAGE_PARAM);
  let usageBin = padZeros(convertHexToBin(usageHex), PLUGIN_COUNT);
  usageBin = flipBitOn(usageBin, PLUGIN_COUNT - pluginIndex);
  tracker.set("&" + USAGE_PARAM, convertBinToHex(usageBin));
}

function trackVersion(tracker) {
  tracker.set("&" + VERSION_PARAM, VERSION);
}

function trackUsage(tracker, plugin) {
  trackVersion(tracker);
  trackPlugin(tracker, plugin);
}

// ---------------------------------------------------------------------------
// autotrack: provide (plugin registration)
// ---------------------------------------------------------------------------

function provide(pluginName, pluginConstructor) {
  const gaAlias = window.GoogleAnalyticsObject || "ga";
  window[gaAlias] =
    window[gaAlias] ||
    function (...args) {
      (window[gaAlias].q = window[gaAlias].q || []).push(args);
    };

  window.gaDevIds = window.gaDevIds || [];
  if (window.gaDevIds.indexOf(DEV_ID) < 0) {
    window.gaDevIds.push(DEV_ID);
  }

  window[gaAlias]("provide", pluginName, pluginConstructor);

  window.gaplugins = window.gaplugins || {};
  window.gaplugins[capitalize(pluginName)] = pluginConstructor;
}

// ---------------------------------------------------------------------------
// Plugin: eventTracker
// ---------------------------------------------------------------------------

class EventTracker {
  constructor(tracker, opts) {
    trackUsage(tracker, pluginIds.EVENT_TRACKER);

    if (!window.addEventListener) {
      return;
    }

    const defaultOpts = {
      events: ["click"],
      fieldsObj: {},
      attributePrefix: "ga-",
    };

    this.opts = Object.assign(defaultOpts, opts);
    this.tracker = tracker;
    this.handleEvents = this.handleEvents.bind(this);

    const selector = "[" + this.opts.attributePrefix + "on]";

    this.delegates = {};
    this.opts.events.forEach((event) => {
      this.delegates[event] = delegate(
        document,
        event,
        selector,
        this.handleEvents,
        { composed: true, useCapture: true }
      );
    });
  }

  handleEvents(event, element) {
    const prefix = this.opts.attributePrefix;
    const events = element.getAttribute(prefix + "on").split(/\s*,\s*/);

    if (events.indexOf(event.type) < 0) {
      return;
    }

    const defaultFields = { transport: "beacon" };
    const attributeFields = getAttributeFields(element, prefix);
    const userFields = Object.assign({}, this.opts.fieldsObj, attributeFields);
    const hitType = attributeFields.hitType || "event";

    this.tracker.send(
      hitType,
      createFieldsObj(
        defaultFields,
        userFields,
        this.tracker,
        this.opts.hitFilter,
        element,
        event
      )
    );
  }

  remove() {
    Object.keys(this.delegates).forEach((key) => {
      this.delegates[key].destroy();
    });
  }
}

provide("eventTracker", EventTracker);

// ---------------------------------------------------------------------------
// Plugin: outboundLinkTracker
// ---------------------------------------------------------------------------

function linkClickWillUnloadCurrentPage(event, link) {
  return !(
    event.type != "click" ||
    link.target == "_blank" ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    event.which > 1
  );
}

class OutboundLinkTracker {
  constructor(tracker, opts) {
    trackUsage(tracker, pluginIds.OUTBOUND_LINK_TRACKER);

    if (!window.addEventListener) {
      return;
    }

    const defaultOpts = {
      events: ["click"],
      linkSelector: "a, area",
      shouldTrackOutboundLink: this.shouldTrackOutboundLink,
      fieldsObj: {},
      attributePrefix: "ga-",
    };

    this.opts = Object.assign(defaultOpts, opts);
    this.tracker = tracker;
    this.handleLinkInteractions = this.handleLinkInteractions.bind(this);

    this.delegates = {};
    this.opts.events.forEach((event) => {
      this.delegates[event] = delegate(
        document,
        event,
        this.opts.linkSelector,
        this.handleLinkInteractions,
        { composed: true, useCapture: true }
      );
    });
  }

  handleLinkInteractions(event, link) {
    if (this.opts.shouldTrackOutboundLink(link, parseUrl)) {
      const href = link.getAttribute("href") || link.getAttribute("xlink:href");
      const url = parseUrl(href);

      const defaultFields = {
        transport: "beacon",
        eventCategory: "Outbound Link",
        eventAction: event.type,
        eventLabel: url.href,
      };

      const userFields = Object.assign(
        {},
        this.opts.fieldsObj,
        getAttributeFields(link, this.opts.attributePrefix)
      );

      const fieldsObj = createFieldsObj(
        defaultFields,
        userFields,
        this.tracker,
        this.opts.hitFilter,
        link,
        event
      );

      if (
        !navigator.sendBeacon &&
        linkClickWillUnloadCurrentPage(event, link)
      ) {
        const clickHandler = () => {
          window.removeEventListener("click", clickHandler);

          if (!event.defaultPrevented) {
            event.preventDefault();

            const oldHitCallback = fieldsObj.hitCallback;
            fieldsObj.hitCallback = withTimeout(function () {
              if (typeof oldHitCallback == "function") {
                oldHitCallback();
              }
              location.href = href;
            });
          }
          this.tracker.send("event", fieldsObj);
        };
        window.addEventListener("click", clickHandler);
      } else {
        this.tracker.send("event", fieldsObj);
      }
    }
  }

  shouldTrackOutboundLink(link, parseUrlFn) {
    const href = link.getAttribute("href") || link.getAttribute("xlink:href");
    const url = parseUrlFn(href);
    return (
      url.hostname != location.hostname && url.protocol.slice(0, 4) == "http"
    );
  }

  remove() {
    Object.keys(this.delegates).forEach((key) => {
      this.delegates[key].destroy();
    });
  }
}

provide("outboundLinkTracker", OutboundLinkTracker);

// ---------------------------------------------------------------------------
// Plugin: urlChangeTracker
// ---------------------------------------------------------------------------

function getPath() {
  return location.pathname + location.search;
}

class UrlChangeTracker {
  constructor(tracker, opts) {
    trackUsage(tracker, pluginIds.URL_CHANGE_TRACKER);

    if (!history.pushState || !window.addEventListener) {
      return;
    }

    const defaultOpts = {
      shouldTrackUrlChange: this.shouldTrackUrlChange,
      trackReplaceState: false,
      fieldsObj: {},
      hitFilter: null,
    };

    this.opts = Object.assign(defaultOpts, opts);
    this.tracker = tracker;
    this.path = getPath();

    this.pushStateOverride = this.pushStateOverride.bind(this);
    this.replaceStateOverride = this.replaceStateOverride.bind(this);
    this.handlePopState = this.handlePopState.bind(this);

    MethodChain.add(history, "pushState", this.pushStateOverride);
    MethodChain.add(history, "replaceState", this.replaceStateOverride);
    window.addEventListener("popstate", this.handlePopState);
  }

  pushStateOverride(originalMethod) {
    return (...args) => {
      originalMethod(...args);
      this.handleUrlChange(true);
    };
  }

  replaceStateOverride(originalMethod) {
    return (...args) => {
      originalMethod(...args);
      this.handleUrlChange(false);
    };
  }

  handlePopState() {
    this.handleUrlChange(true);
  }

  handleUrlChange(historyDidUpdate) {
    setTimeout(() => {
      const oldPath = this.path;
      const newPath = getPath();

      if (
        oldPath != newPath &&
        this.opts.shouldTrackUrlChange.call(this, newPath, oldPath)
      ) {
        this.path = newPath;
        this.tracker.set({
          page: newPath,
          title: document.title,
        });

        if (historyDidUpdate || this.opts.trackReplaceState) {
          const defaultFields = { transport: "beacon" };
          this.tracker.send(
            "pageview",
            createFieldsObj(
              defaultFields,
              this.opts.fieldsObj,
              this.tracker,
              this.opts.hitFilter
            )
          );
        }
      }
    }, 0);
  }

  shouldTrackUrlChange(newPath, oldPath) {
    return !!(newPath && oldPath);
  }

  remove() {
    MethodChain.remove(history, "pushState", this.pushStateOverride);
    MethodChain.remove(history, "replaceState", this.replaceStateOverride);
    window.removeEventListener("popstate", this.handlePopState);
  }
}

provide("urlChangeTracker", UrlChangeTracker);
