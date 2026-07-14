import { buildTeam, buildUser } from "@server/test/factories";
import SearchQuery from "./SearchQuery";

describe("SearchQuery.record", () => {
  it("updates the existing record when a query extends a recent one", async () => {
    const user = await buildUser();
    const teamId = user.teamId;

    const first = await SearchQuery.record({
      userId: user.id,
      teamId,
      source: "app",
      query: "conf",
      results: 3,
      duration: 10,
    });

    const second = await SearchQuery.record({
      userId: user.id,
      teamId,
      source: "app",
      query: "conflue",
      results: 5,
      duration: 12,
    });

    expect(second.id).toEqual(first.id);
    expect(second.query).toEqual("conflue");
    expect(second.results).toEqual(5);
    expect(await SearchQuery.count({ where: { teamId } })).toEqual(1);
  });

  it("updates the existing record when a query is shortened", async () => {
    const user = await buildUser();
    const teamId = user.teamId;

    const first = await SearchQuery.record({
      userId: user.id,
      teamId,
      source: "app",
      query: "conflue",
      results: 5,
      duration: 12,
    });

    const second = await SearchQuery.record({
      userId: user.id,
      teamId,
      source: "app",
      query: "conf",
      results: 3,
      duration: 10,
    });

    expect(second.id).toEqual(first.id);
    expect(second.query).toEqual("conf");
    expect(await SearchQuery.count({ where: { teamId } })).toEqual(1);
  });

  it("creates a new record for an unrelated query", async () => {
    const user = await buildUser();
    const teamId = user.teamId;

    await SearchQuery.record({
      userId: user.id,
      teamId,
      source: "app",
      query: "conflue",
      results: 5,
      duration: 12,
    });

    await SearchQuery.record({
      userId: user.id,
      teamId,
      source: "app",
      query: "database",
      results: 2,
      duration: 8,
    });

    expect(await SearchQuery.count({ where: { teamId } })).toEqual(2);
  });

  it("does not collapse queries from different scopes", async () => {
    const team = await buildTeam();
    const userA = await buildUser({ teamId: team.id });
    const userB = await buildUser({ teamId: team.id });

    await SearchQuery.record({
      userId: userA.id,
      teamId: team.id,
      source: "app",
      query: "conf",
      results: 1,
      duration: 5,
    });

    await SearchQuery.record({
      userId: userB.id,
      teamId: team.id,
      source: "app",
      query: "conflue",
      results: 1,
      duration: 5,
    });

    expect(await SearchQuery.count({ where: { teamId: team.id } })).toEqual(2);
  });

  it("does not collapse when there is no user or share to scope by", async () => {
    const team = await buildTeam();

    await SearchQuery.record({
      teamId: team.id,
      source: "api",
      query: "conf",
      results: 1,
      duration: 5,
    });

    await SearchQuery.record({
      teamId: team.id,
      source: "api",
      query: "conflue",
      results: 1,
      duration: 5,
    });

    expect(await SearchQuery.count({ where: { teamId: team.id } })).toEqual(2);
  });

  it("creates a new record once the recency window has passed", async () => {
    const user = await buildUser();
    const teamId = user.teamId;

    const first = await SearchQuery.record({
      userId: user.id,
      teamId,
      source: "app",
      query: "conf",
      results: 1,
      duration: 5,
    });

    // Backdate the first record beyond the recency window.
    await SearchQuery.sequelize!.query(
      `UPDATE search_queries SET "createdAt" = :createdAt WHERE id = :id`,
      {
        replacements: {
          createdAt: new Date(Date.now() - SearchQuery.recencyWindow - 1000),
          id: first.id,
        },
      }
    );

    await SearchQuery.record({
      userId: user.id,
      teamId,
      source: "app",
      query: "conflue",
      results: 1,
      duration: 5,
    });

    expect(await SearchQuery.count({ where: { teamId } })).toEqual(2);
  });
});
