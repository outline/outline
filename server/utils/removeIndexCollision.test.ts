import { buildCollection } from "@server/test/factories";
import removeIndexCollision from "./removeIndexCollision";

describe("removeIndexCollision", () => {
  it("should return the next available index", async () => {
    const collection = await buildCollection({ index: "P" });
    expect(
      await removeIndexCollision(collection.teamId, collection.index!)
    ).toEqual("h");
  });

  it("should return existing index if no collision", async () => {
    const collection = await buildCollection({ index: "%P" });
    expect(await removeIndexCollision(collection.teamId, "n")).toEqual("n");
  });
});
