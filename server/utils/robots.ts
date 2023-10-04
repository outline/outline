import env from "@server/env";

export const robotsResponse = () => {
  if (env.isCloudHosted) {
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
