import { buildUser } from "@server/test/factories";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

describe("#files.create", () => {
  it("should fail with status 400 bad request if key is invalid", async () => {
    const user = await buildUser();
    const res = await server.post("/api/files.create", {
      body: {
        token: user.getJwtToken(),
        key: "public/foo/bar/baz.png",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.message).toEqual(
      "key: Must be of the form uploads/<uuid>/<uuid>/<name> or public/<uuid>/<uuid>/<name>"
    );
  });
});

describe("#files.get", () => {
  it("should fail with status 400 bad request if key is invalid", async () => {
    const res = await server.get(`/api/files.get?key=public/foo/bar/baz.png`);
    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.message).toEqual(
      "key: Must be of the form uploads/<uuid>/<uuid>/<name> or public/<uuid>/<uuid>/<name>"
    );
  });
  it("should fail with status 400 bad request if none of key or sig is supplied", async () => {
    const res = await server.get("/api/files.get");
    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.message).toEqual("query: One of key or sig is required");
  });
});
