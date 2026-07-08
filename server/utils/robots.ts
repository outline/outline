import env from "@server/env";

/**
 * Returns the robots.txt content for the installation, allowing crawlers on
 * cloud-hosted installations and disallowing them when self-hosted.
 *
 * @returns the robots.txt content.
 */
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
