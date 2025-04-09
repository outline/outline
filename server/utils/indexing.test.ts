import {
  buildCollection,
  buildDocument,
  buildStar,
  buildTeam,
  buildUser,
} from "@server/test/factories";
import { collectionIndexing, starIndexing } from "./indexing";

describe("collectionIndexing", () => {
  it("should generate index for collections without index", async () => {
    const team = await buildTeam();
    const collections = await Promise.all([
      buildCollection({
        teamId: team.id,
      }),
      buildCollection({
        teamId: team.id,
      }),
    ]);

    // Set index to null to simulate no index
    collections[0].index = null;
    collections[1].index = null;
    await collections[0].save({ hooks: false });
    await collections[1].save({ hooks: false });

    const result = await collectionIndexing(team.id, {});
    expect(Object.keys(result).length).toBe(2);
    expect(result[collections[0].id]).toBeTruthy();
    expect(result[collections[1].id]).toBeTruthy();
  });

  it("should maintain existing indices", async () => {
    const team = await buildTeam();
    const collection = await buildCollection({
      teamId: team.id,
      index: "a1",
    });

    const result = await collectionIndexing(team.id, {});
    expect(result[collection.id]).toBe("a1");
  });
});

describe("starIndexing", () => {
  it("should generate index for stars without index", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const document = await buildDocument();
    const stars = await Promise.all([
      buildStar({
        userId: user.id,
        documentId: document.id,
      }),
      buildStar({
        userId: user.id,
        documentId: document.id,
      }),
    ]);

    // Set index to null to simulate no index
    stars[0].index = null;
    stars[1].index = null;
    await stars[0].save({ hooks: false });
    await stars[1].save({ hooks: false });

    const result = await starIndexing(user.id);
    expect(Object.keys(result).length).toBe(2);
    expect(result[stars[0].id]).toBeTruthy();
    expect(result[stars[1].id]).toBeTruthy();
  });

  it("should maintain existing indices", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const document = await buildDocument();
    const star = await buildStar({
      userId: user.id,
      documentId: document.id,
      index: "a1",
    });

    const result = await starIndexing(user.id);
    expect(result[star.id]).toBe("a1");
  });
});
