import type { Context } from "koa";
import "koa";
const DISALLOW_ROBOTS = `User-agent: *
Disallow: /`;
export const robotsResponse = (ctx: Context): string | null | undefined => {
  if (process.env.DEPLOYMENT !== "hosted") {
    return DISALLOW_ROBOTS;
  }
};
