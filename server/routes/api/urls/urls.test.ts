import { UnfurlResourceType } from "@shared/types";
import env from "@server/env";
import { User } from "@server/models";
import { buildDocument, buildUser } from "@server/test/factories";
import { getTestServer } from "@server/test/support";
import Iframely from "plugins/iframely/server/iframely";

jest.mock("dns", () => ({
  resolveCname: (
    input: string,
    callback: (err: Error | null, addresses: string[]) => void
  ) => {
    if (input.includes("valid.custom.domain")) {
      callback(null, ["secure.outline.dev"]);
    } else {
      callback(null, []);
    }
  },
}));

jest
  .spyOn(Iframely, "requestResource")
  .mockImplementation(() => Promise.resolve(undefined));

const server = getTestServer();

describe("#urls.unfurl", () => {
  let user: User;
  beforeEach(async () => {
    user = await buildUser();
  });

  it("should fail with status 400 bad request when url is invalid", async () => {
    const res = await server.post("/api/urls.unfurl", {
      body: {
        token: user.getJwtToken(),
        url: "/doc/foo-bar",
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.message).toEqual("url: Invalid url");
  });

  it("should fail with status 400 bad request when mention url is invalid", async () => {
    const res = await server.post("/api/urls.unfurl", {
      body: {
        token: user.getJwtToken(),
        url: "mention://1/foo/1",
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.message).toEqual("url: Must be a valid url");
  });

  it("should fail with status 400 bad request when mention url is supplied without documentId", async () => {
    const res = await server.post("/api/urls.unfurl", {
      body: {
        token: user.getJwtToken(),
        url: "mention://2767ba0e-ac5c-4533-b9cf-4f5fc456600e/user/34095ac1-c808-45c0-8c6e-6c554497de64",
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.message).toEqual("body: documentId required");
  });

  it("should fail with status 404 not found when mention user does not exist", async () => {
    const res = await server.post("/api/urls.unfurl", {
      body: {
        token: user.getJwtToken(),
        url: "mention://2767ba0e-ac5c-4533-b9cf-4f5fc456600e/user/34095ac1-c808-45c0-8c6e-6c554497de64",
        documentId: "2767ba0e-ac5c-4533-b9cf-4f5fc456600e",
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(404);
    expect(body.message).toEqual("Mentioned user does not exist");
  });

  it("should fail with status 404 not found when document does not exist", async () => {
    const mentionedUser = await buildUser({
      teamId: user.teamId,
    });

    const res = await server.post("/api/urls.unfurl", {
      body: {
        token: user.getJwtToken(),
        url: `mention://2767ba0e-ac5c-4533-b9cf-4f5fc456600e/user/${mentionedUser.id}`,
        documentId: "2767ba0e-ac5c-4533-b9cf-4f5fc456600e",
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(404);
    expect(body.message).toEqual("Document does not exist");
  });

  it("should fail with status 403 forbidden when user is not authorized to read mentioned user info", async () => {
    const mentionedUser = await buildUser();
    const document = await buildDocument({
      teamId: user.teamId,
    });

    const res = await server.post("/api/urls.unfurl", {
      body: {
        token: user.getJwtToken(),
        url: `mention://2767ba0e-ac5c-4533-b9cf-4f5fc456600e/user/${mentionedUser.id}`,
        documentId: document.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(403);
    expect(body.message).toEqual("Authorization error");
  });

  it("should succeed with status 200 ok when valid mention url is supplied", async () => {
    const mentionedUser = await buildUser({ teamId: user.teamId });
    const document = await buildDocument({
      teamId: user.teamId,
    });

    const res = await server.post("/api/urls.unfurl", {
      body: {
        token: user.getJwtToken(),
        url: `mention://2767ba0e-ac5c-4533-b9cf-4f5fc456600e/user/${mentionedUser.id}`,
        documentId: document.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.type).toEqual(UnfurlResourceType.Mention);
    expect(body.name).toEqual(mentionedUser.name);
  });

  it("should succeed with status 200 ok when valid document url is supplied", async () => {
    const document = await buildDocument({
      teamId: user.teamId,
    });

    const res = await server.post("/api/urls.unfurl", {
      body: {
        token: user.getJwtToken(),
        url: `${env.URL}/${document.url}`,
        documentId: document.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.type).toEqual(UnfurlResourceType.Document);
    expect(body.title).toEqual(document.titleWithDefault);
    expect(body.id).toEqual(document.id);
  });

  it("should succeed with status 200 ok for a valid external url", async () => {
    (Iframely.requestResource as jest.Mock).mockResolvedValue(
      Promise.resolve({
        url: "https://www.flickr.com",
        type: "rich",
        title: "Flickr",
        description:
          "The safest and most inclusive global community of photography enthusiasts. The best place for inspiration, connection, and sharing!",
        thumbnail_url:
          "https://farm4.staticflickr.com/3914/15118079089_489aa62638_b.jpg",
      })
    );

    const res = await server.post("/api/urls.unfurl", {
      body: {
        token: user.getJwtToken(),
        url: "https://www.flickr.com",
      },
    });

    expect(res.status).toEqual(200);
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.url).toEqual("https://www.flickr.com");
    expect(body.type).toEqual(UnfurlResourceType.OEmbed);
    expect(body.title).toEqual("Flickr");
    expect(body.description).toEqual(
      "The safest and most inclusive global community of photography enthusiasts. The best place for inspiration, connection, and sharing!"
    );
    expect(body.thumbnailUrl).toEqual(
      "https://farm4.staticflickr.com/3914/15118079089_489aa62638_b.jpg"
    );
  });

  it("should succeed with status 204 no content for a non-existing external url", async () => {
    (Iframely.requestResource as jest.Mock).mockResolvedValue(
      Promise.resolve({
        status: 404,
        error:
          "Iframely could not fetch the given URL. The content is no longer available at the origin.",
      })
    );

    const res = await server.post("/api/urls.unfurl", {
      body: {
        token: user.getJwtToken(),
        url: "https://random.url",
      },
    });

    expect(res.status).toEqual(204);
  });
});

describe("#urls.validateCustomDomain", () => {
  it("should succeed with custom domain pointing at server", async () => {
    const user = await buildUser();
    const res = await server.post("/api/urls.validateCustomDomain", {
      body: {
        token: user.getJwtToken(),
        hostname: "valid.custom.domain",
      },
    });
    expect(res.status).toEqual(200);
  });

  it("should fail with another domain", async () => {
    const user = await buildUser();
    const res = await server.post("/api/urls.validateCustomDomain", {
      body: {
        token: user.getJwtToken(),
        hostname: "google.com",
      },
    });
    expect(res.status).toEqual(400);
  });
});
