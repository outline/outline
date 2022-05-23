import env from "@server/env";

export const robotsResponse = () => {
  if (env.DEPLOYMENT === "hosted") {
    return `
User-agent: *
Allow: /
`;
  }

  return `
User-agent: *
Disallow: /
`;
};
