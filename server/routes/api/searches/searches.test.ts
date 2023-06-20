import { SearchQuery, User } from "@server/models";
import { buildSearchQuery, buildUser } from "@server/test/factories";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

describe("#searches.list", () => {
  let user: User;

  beforeEach(async () => {
    user = await buildUser();

    await Promise.all([
      buildSearchQuery({
        userId: user.id,
        teamId: user.teamId,
      }),
      buildSearchQuery({
        userId: user.id,
        teamId: user.teamId,
        query: "foo",
      }),
      buildSearchQuery({
        userId: user.id,
        teamId: user.teamId,
        query: "bar",
      }),
    ]);
  });

  it("should succeed with status 200 ok returning results", async () => {
    const res = await server.post("/api/searches.list", {
      body: {
        token: user.getJwtToken(),
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data).toHaveLength(3);
    const queries = body.data.map((d: any) => d.query);
    expect(queries).toContain("query");
    expect(queries).toContain("foo");
    expect(queries).toContain("bar");
  });
});

describe("#searches.delete", () => {
  let user: User;
  let searchQuery: SearchQuery;

  beforeEach(async () => {
    user = await buildUser();

    searchQuery = await buildSearchQuery({
      userId: user.id,
      teamId: user.teamId,
    });
  });

  it("should fail with status 400 bad request when no id or query is provided", async () => {
    const res = await server.post("/api/searches.delete", {
      body: {
        token: user.getJwtToken(),
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.message).toEqual("id or query is required");
  });

  it("should fail with status 400 bad request when an invalid id is provided", async () => {
    const res = await server.post("/api/searches.delete", {
      body: {
        token: user.getJwtToken(),
        id: "id",
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.message).toEqual("id: Invalid uuid");
  });

  it("should succeed with status 200 ok and successfully delete the query", async () => {
    let searchQueries = await SearchQuery.findAll({
      where: {
        userId: user.id,
        teamId: user.teamId,
      },
    });
    expect(searchQueries).toHaveLength(1);

    const res = await server.post("/api/searches.delete", {
      body: {
        token: user.getJwtToken(),
        id: searchQuery.id,
      },
    });

    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.success).toEqual(true);

    searchQueries = await SearchQuery.findAll({
      where: {
        userId: user.id,
        teamId: user.teamId,
      },
    });
    expect(searchQueries).toHaveLength(0);
  });
});
