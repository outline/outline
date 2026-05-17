import { buildUser } from "@server/test/factories";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

describe("#pagination", () => {
  it("should allow offset and limit", async () => {
    const user = await buildUser();
    const res = await server.post("/api/users.list", user, {
      body: {
        limit: 1,
        offset: 1,
      },
    });
    expect(res.status).toEqual(200);
  });

  it("should not allow negative limit", async () => {
    const user = await buildUser();
    const res = await server.post("/api/users.list", user, {
      body: {
        limit: -1,
      },
    });
    expect(res.status).toEqual(400);
  });

  it("should not allow non-integer limit", async () => {
    const user = await buildUser();
    const res = await server.post("/api/users.list", user, {
      body: {
        limit: "blah",
      },
    });
    expect(res.status).toEqual(400);
  });

  it("should not allow negative offset", async () => {
    const user = await buildUser();
    const res = await server.post("/api/users.list", user, {
      body: {
        offset: -1,
      },
    });
    expect(res.status).toEqual(400);
  });

  it("should not allow non-integer offset", async () => {
    const user = await buildUser();
    const res = await server.post("/api/users.list", user, {
      body: {
        offset: "blah",
      },
    });
    expect(res.status).toEqual(400);
  });
});
