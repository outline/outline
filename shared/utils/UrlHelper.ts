const urls = {
  github: "https://www.github.com/outline/outline/issues",
  twitter: "https://twitter.com/getoutline",
  contact: "https://www.getoutline.com/contact",
  developers: "https://www.getoutline.com/developers",
  changelog: "https://www.getoutline.com/changelog",
};

const SLUG_URL_REGEX = /^(?:[0-9a-zA-Z-_~]*-)?([a-zA-Z0-9]{10,15})$/;
const SHARE_URL_SLUG_REGEX = /^[0-9a-z-]+$/;

export const UrlHelper = {
  ...urls,
  SLUG_URL_REGEX,
  SHARE_URL_SLUG_REGEX,
};
