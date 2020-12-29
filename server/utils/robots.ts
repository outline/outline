import { Context } from "koa";

const DISALLOW_ROBOTS = `User-agent: *
Disallow: /`;

export const robotsResponse = (ctx: Context): string | null => {
  if (ctx.headers.host.indexOf("getoutline.com") < 0) return DISALLOW_ROBOTS;
};
