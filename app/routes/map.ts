// oxlint-disable no-explicit-any -- ComponentType<any> is the standard React pattern for generic component constraints
import type * as React from "react";
import { createLazyComponent } from "~/components/LazyLoad";
import {
  matchArchive,
  matchChangesets,
  matchCollection,
  matchCollectionEdit,
  matchDebug,
  matchDocument,
  matchDrafts,
  matchHome,
  matchSearch,
  matchSettings,
  matchShare,
  matchTrash,
} from "~/utils/routeHelpers";

/**
 * A lazy-loaded route in the application, pairing the path patterns it
 * renders at with the code-split component and a way to prefetch it.
 */
export interface RouteMapEntry {
  /** Patterns, in react-router syntax, matching the locations the scene renders at. */
  paths: string[];
  /** The lazy-loaded component rendered for the route. */
  Component: React.LazyExoticComponent<React.ComponentType<any>>;
  /** Imports the code-split chunk(s) for the route ahead of render. */
  prefetch: () => Promise<unknown>;
}

/**
 * The single source of truth for lazy-loaded routes that are reachable
 * through in-app navigation. Route definitions (see `./index` and
 * `./authenticated`) render `Component` at `paths`, and hovering a link is
 * used as a signal to call `prefetch` (see `./prefetch`) so the code is
 * already available when the user navigates.
 *
 * Note: Prefetch matching checks entries in order and patterns are matched
 * non-exactly, so list more specific routes before routes they share a
 * prefix with.
 */
export const routeMap = {
  drafts: defineRoute(matchDrafts, () => import("~/scenes/Drafts")),
  archive: defineRoute(matchArchive, () => import("~/scenes/Archive")),
  trash: defineRoute(matchTrash, () => import("~/scenes/Trash")),
  home: defineRoute(matchHome, () => import("~/scenes/Home")),
  search: defineRoute(matchSearch, () => import("~/scenes/Search")),
  collection: defineRoute(
    [matchCollectionEdit, matchCollection],
    () => import("~/scenes/Collection")
  ),
  document: defineRoute(matchDocument, () => import("~/scenes/Document")),
  settings: defineRoute(matchSettings, () => import("./settings")),
  shared: defineRoute(matchShare, () => import("~/scenes/Shared")),
  changesets: defineRoute(
    matchChangesets,
    () => import("~/scenes/Developer/Changesets")
  ),
  debug: defineRoute(matchDebug, () => import("~/scenes/Developer/Debug")),
};

function defineRoute(
  paths: string | string[],
  load: () => Promise<{ default: React.ComponentType<any> }>
): RouteMapEntry {
  const { Component, prefetch } = createLazyComponent(load);
  return {
    paths: Array.isArray(paths) ? paths : [paths],
    Component,
    prefetch,
  };
}
