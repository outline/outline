// @flow
import { type Context } from "koa";

const DISALLOW_ROBOTS = `User-agent: *
Disallow: /`;

export const robotsResponse = (ctx: Context): ?string => {
  if (process.env.DEPLOYMENT !== "hosted") {
    return DISALLOW_ROBOTS;
  }
};
