import { http, passthrough } from "msw";
import { setupServer } from "msw/node";

// Pass-through handlers for in-process supertest requests. Registered as
// initial handlers so they survive server.resetHandlers() between tests.
const passthroughLocalhost = http.all(
  /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?(\/|$)/,
  () => passthrough()
);

export const server = setupServer(passthroughLocalhost);
