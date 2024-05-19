export class UrlHelper {
  public static github = "https://www.github.com/outline/outline/issues";
  public static twitter = "https://twitter.com/getoutline";
  public static contact = "https://www.getoutline.com/contact";
  public static developers = "https://www.getoutline.com/developers";
  public static changelog = "https://www.getoutline.com/changelog";
  public static guide = "https://docs.getoutline.com/s/guide";

  public static SLUG_URL_REGEX = /^(?:[0-9a-zA-Z-_~]*-)?([a-zA-Z0-9]{10,15})$/;
  public static SHARE_URL_SLUG_REGEX = /^[0-9a-z-]+$/;
}
