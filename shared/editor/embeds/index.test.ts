import { getMatchingEmbed } from "../lib/embeds";
import embeds from "./index";

/**
 * The generic iframe embed is last in the list and matches any http(s) URL, so
 * asserting on the id of the winning descriptor — rather than on the Google Maps
 * matcher in isolation — also covers the case where an earlier descriptor claims
 * the URL first.
 */
const matchingEmbedId = (url: string) =>
  getMatchingEmbed(embeds, url)?.embed.id;

describe("google-maps", () => {
  const accepted = [
    // "Share > Embed a map" dialog
    "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2624.9",
    "http://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2624.9",
    "https://google.com/maps/embed?pb=!1m18!1m12!1m3!1d2624.9",
    // Maps Embed API
    "https://www.google.com/maps/embed/v1/place?key=K&q=Eiffel+Tower,Paris",
    "https://www.google.com/maps/embed/v1/view?key=K&center=59.4,17.9&zoom=8",
    "https://www.google.com/maps/embed/v1/directions?key=K&origin=A&destination=B&waypoints=C%7CD",
    "https://www.google.com/maps/embed/v1/streetview?key=K&location=46.4,2.9",
    "https://www.google.com/maps/embed/v1/search?key=K&q=record+stores+in+Seattle",
    // My Maps
    "https://www.google.com/maps/d/embed?mid=1a2b3c",
  ];

  const rejected = [
    // An iframe src always carries parameters
    "https://www.google.com/maps/embed/v1/directions",
    "https://www.google.com/maps/embed",
    // An ordinary maps link, not an embed
    "https://www.google.com/maps/dir/Berlin/Prague/",
    // Mode is not one of the documented five
    "https://www.google.com/maps/embed/v1/hack?key=K",
    "https://www.google.com/maps/embed/v1/../../evil?x=1",
    // Lookalike hosts
    "https://www.google.com.evil.tld/maps/embed?pb=1",
    "https://evil-www.google.com.co/maps/embed?pb=1",
  ];

  it.each(accepted)("matches %s", (url) => {
    expect(matchingEmbedId(url)).toBe("google-maps");
  });

  it.each(rejected)("does not match %s", (url) => {
    expect(matchingEmbedId(url)).not.toBe("google-maps");
  });

  it("passes the URL through unchanged as the iframe src", () => {
    const url = "https://www.google.com/maps/embed/v1/place?key=K&q=Paris";
    const match = getMatchingEmbed(embeds, url);

    expect(match?.embed.transformMatch?.(match.matches)).toBe(url);
  });
});
