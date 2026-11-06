import env from "../../env";
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
    // My Maps, with and without the multi-account /u/<n> segment
    "https://www.google.com/maps/d/embed?mid=1a2b3c",
    "https://www.google.com/maps/d/u/0/embed?mid=1a2b3c",
    "https://www.google.com/maps/d/u/12/embed?mid=1a2b3c",
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
    // The My Maps account segment is an index, not an arbitrary path
    "https://www.google.com/maps/d/u/x/embed?mid=1a2b3c",
    "https://www.google.com/maps/d/evil/embed?mid=1a2b3c",
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

describe("google-maps api key injection", () => {
  // shared/env resolves to process.env on the server and window.env in the
  // browser; mutating the resolved object covers both test environments.
  // Assigning undefined is not the same as unsetting — process.env coerces it
  // to the string "undefined" — so absence has to be expressed with delete.
  const original = env.GOOGLE_MAPS_EMBED_API_KEY;

  const setKey = (value?: string) => {
    if (value === undefined) {
      delete env.GOOGLE_MAPS_EMBED_API_KEY;
      return;
    }
    env.GOOGLE_MAPS_EMBED_API_KEY = value;
  };

  const src = (url: string) => {
    const match = getMatchingEmbed(embeds, url);
    return match?.embed.transformMatch?.(match.matches);
  };

  afterEach(() => {
    setKey(original);
  });

  it("appends the configured key to a Maps Embed API URL", () => {
    setKey("AIzaSyTest");

    expect(src("https://www.google.com/maps/embed/v1/view?center=1,2")).toBe(
      "https://www.google.com/maps/embed/v1/view?center=1,2&key=AIzaSyTest"
    );
  });

  it("percent-encodes the key", () => {
    setKey("a b&c");

    expect(src("https://www.google.com/maps/embed/v1/view?center=1,2")).toBe(
      "https://www.google.com/maps/embed/v1/view?center=1,2&key=a%20b%26c"
    );
  });

  it("leaves a key already present in the URL alone", () => {
    setKey("AIzaSyTest");
    const url = "https://www.google.com/maps/embed/v1/view?key=Inline&zoom=8";

    expect(src(url)).toBe(url);
  });

  it("does not touch the legacy share URL, which takes no key", () => {
    setKey("AIzaSyTest");
    const url = "https://www.google.com/maps/embed?pb=!1m18!1m12";

    expect(src(url)).toBe(url);
  });

  it("does not touch My Maps, which takes no key", () => {
    setKey("AIzaSyTest");
    const url = "https://www.google.com/maps/d/embed?mid=1a2b3c";

    expect(src(url)).toBe(url);
  });

  it("keeps the key in the query string when the URL has a fragment", () => {
    setKey("AIzaSyTest");

    expect(
      src("https://www.google.com/maps/embed/v1/view?center=1,2#map")
    ).toBe(
      "https://www.google.com/maps/embed/v1/view?center=1,2&key=AIzaSyTest#map"
    );
  });

  it("does not mistake a key= inside a fragment for a real one", () => {
    setKey("AIzaSyTest");

    expect(
      src("https://www.google.com/maps/embed/v1/view?center=1,2#key=nope")
    ).toBe(
      "https://www.google.com/maps/embed/v1/view?center=1,2&key=AIzaSyTest#key=nope"
    );
  });

  it("does not emit ?&key= when the query string is empty", () => {
    setKey("AIzaSyTest");

    expect(src("https://www.google.com/maps/embed/v1/view?")).toBe(
      "https://www.google.com/maps/embed/v1/view?key=AIzaSyTest"
    );
  });

  it("returns the URL untouched when no key is configured", () => {
    setKey(undefined);
    const url = "https://www.google.com/maps/embed/v1/view?center=1,2";

    expect(src(url)).toBe(url);
  });
});
