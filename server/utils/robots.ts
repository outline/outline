import env from "@server/env";

const DISALLOW_ROBOTS = `User-agent: *
Disallow: /`;

export const robotsResponse = () => {
  if (env.DEPLOYMENT !== "hosted") {
    return DISALLOW_ROBOTS;
  }

  return undefined;
};
