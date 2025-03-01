import * as React from "react";
import useMediaQuery from "~/hooks/useMediaQuery";

/**
 * A component that renders its children if the media query is true.
 *
 * @param query The media query to check.
 */
export function MediaQuery({
  query,
  children,
}: {
  query: string;
  children: React.ReactNode;
}) {
  return useMediaQuery(query) ? <>{children}</> : null;
}

/**
 * A component that renders its children unless the media query is true.
 *
 * @param query The media query to check.
 */
export function NotMediaQuery({
  query,
  children,
}: {
  query: string;
  children: React.ReactNode;
}) {
  return !useMediaQuery(query) ? <>{children}</> : null;
}
