import * as Sentry from "@sentry/react";
import { Route } from "react-router-dom";
import env from "~/env";

let Component;

if (env.SENTRY_DSN) {
  Component = Sentry.withSentryRouting(Route);
} else {
  Component = Route;
}

export default Component as typeof Route;
