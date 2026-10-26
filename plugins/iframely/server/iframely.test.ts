// @vitest-isolate true
import type { Mock } from "vitest";
import { randomString } from "@shared/random";
import { UnfurlResourceType } from "@shared/types";
import { Hour } from "@shared/utils/time";
import type { User } from "@server/models";
import Redis from "@server/storage/redis";
import { buildUser } from "@server/test/factories";
import { getTestServer } from "@server/test/support";
import { RedisPrefixHelper } from "@server/utils/RedisPrefixHelper";
import Iframely from "./iframely";

vi.spyOn(Iframely, "requestResource").mockImplementation(() =>
  Promise.resolve({})
);

const server = getTestServer();

describe("#urls.unfurl", () => {
  let user: User;
  beforeEach(async () => {
    user = await buildUser();
  });

  it("should succeed with status 200 ok for a valid external url", async () => {
    (Iframely.requestResource as Mock).mockResolvedValue(
      Promise.resolve({
        url: "https://www.flickr.com",
        type: "rich",
        meta: {
          title: "Flickr",
          description:
            "The safest and most inclusive global community of photography enthusiasts. The best place for inspiration, connection, and sharing!",
        },
        links: {
          thumbnail: [
            {
              href: "https://combo.staticflickr.com/66a031f9fc343c5e42d965ca/671aaf5d51c929e483e8b26d_Open%20Graph%20Home.jpg",
              type: "image/jpg",
              rel: ["twitter", "thumbnail", "ssl", "og"],
              content_length: 412824,
              media: {
                width: 1200,
                height: 630,
              },
            },
          ],
          icon: [
            {
              href: "https://combo.staticflickr.com/66a031f9fc343c5e42d965ca/67167dd041b0982f0f230dab_flickr-webclip.png",
              rel: ["apple-touch-icon", "icon", "ssl"],
              type: "image/png",
            },
          ],
        },
      })
    );

    const res = await server.post("/api/urls.unfurl", user, {
      body: {
        url: "https://www.flickr.com",
      },
    });

    expect(res.status).toEqual(200);
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.url).toEqual("https://www.flickr.com");
    expect(body.type).toEqual(UnfurlResourceType.URL);
    expect(body.title).toEqual("Flickr");
    expect(body.description).toEqual(
      "The safest and most inclusive global community of photography enthusiasts. The best place for inspiration, connection, and sharing!"
    );
    expect(body.thumbnailUrl).toEqual(
      "https://combo.staticflickr.com/66a031f9fc343c5e42d965ca/671aaf5d51c929e483e8b26d_Open%20Graph%20Home.jpg"
    );
  });

  it("should succeed with status 204 no content for a non-existing external url", async () => {
    (Iframely.requestResource as Mock).mockResolvedValue(
      Promise.resolve({
        status: 404,
        error:
          "Iframely could not fetch the given URL. The content is no longer available at the origin.",
      })
    );

    const res = await server.post("/api/urls.unfurl", user, {
      body: {
        url: "https://random.url",
      },
    });

    expect(res.status).toEqual(204);
  });

  it("should cache a permanent external url error for a day", async () => {
    (Iframely.requestResource as Mock).mockResolvedValue({
      status: 403,
      error: "Iframely could not fetch the given URL.",
    });
    const url = `https://${randomString(8)}.example.com`;

    const res = await server.post("/api/urls.unfurl", user, {
      body: { url },
    });

    expect(res.status).toEqual(204);
    const ttl = await Redis.defaultClient.ttl(
      RedisPrefixHelper.getUnfurlKey(user.teamId, user.id, url)
    );
    expect(ttl).toBeGreaterThan(Hour.seconds);
  });

  it("should cache a transient external url error for a minute", async () => {
    (Iframely.requestResource as Mock).mockResolvedValue({
      status: 418,
      error: "Iframely timed out fetching the given URL.",
    });
    const url = `https://${randomString(8)}.example.com`;

    const res = await server.post("/api/urls.unfurl", user, {
      body: { url },
    });

    expect(res.status).toEqual(204);
    const ttl = await Redis.defaultClient.ttl(
      RedisPrefixHelper.getUnfurlKey(user.teamId, user.id, url)
    );
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(60);
  });
});
