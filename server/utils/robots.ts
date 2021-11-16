import { Context } from "koa";

const DISALLOW_ROBOTS = `User-agent: *
Disallow: /`;

// @ts-expect-error ts-migrate(7030) FIXME: Not all code paths return a value.
export const robotsResponse = (ctx: Context): string | null | undefined => {
  if (process.env.DEPLOYMENT !== "hosted") {
    return DISALLOW_ROBOTS;
  }
};
