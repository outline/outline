class Outline {
  public static github = "https://www.github.com/outline/outline/issues";
  public static twitter = "https://twitter.com/getoutline";
  public static contact = "https://www.getoutline.com/contact";
  public static developers = "https://www.getoutline.com/developers";
  public static changelog = "https://www.getoutline.com/changelog";
}

const SLUG_URL_REGEX = /^(?:[0-9a-zA-Z-_~]*-)?([a-zA-Z0-9]{10,15})$/;
const SHARE_URL_SLUG_REGEX = /^[0-9a-z-]+$/;

export const UrlHelper = {
  Outline,
  SLUG_URL_REGEX,
  SHARE_URL_SLUG_REGEX,
};
