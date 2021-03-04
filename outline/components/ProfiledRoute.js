// @flow
import * as Sentry from "@sentry/react";
import { Route } from "react-router-dom";

let Component = Route;

if (process.env.GATSBY_SENTRY_DSN) {
  Component = Sentry.withSentryRouting(Route);
}

export default Component;
