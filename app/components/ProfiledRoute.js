// @flow
import * as Sentry from "@sentry/react";
import { Route } from "react-router-dom";
import env from "env";

let Component = Route;

if (env.SENTRY_DSN) {
  Component = Sentry.withSentryRouting(Route);
}

export default Component;
