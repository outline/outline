const DISALLOW_ROBOTS = `User-agent: *
Disallow: /`;

export const robotsResponse = () => {
  if (process.env.DEPLOYMENT !== "hosted") {
    return DISALLOW_ROBOTS;
  }

  return undefined;
};
