import isCloudHosted from "./isCloudHosted";

export const robotsResponse = () => {
  if (isCloudHosted) {
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
