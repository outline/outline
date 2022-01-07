import {
  buildUser,
  buildTeam,
  buildDocument,
  buildCollection,
} from "@server/test/factories";
import { flushdb } from "@server/test/support";
import { serialize } from "./index";

beforeEach(() => flushdb());

describe("read_write collection", () => {
  it("should allow read write permissions for team member", async () => {
    const team = await buildTeam();
    const user = await buildUser({
      teamId: team.id,
    });
    const collection = await buildCollection({
      teamId: team.id,
      permission: "read_write",
    });
    const document = await buildDocument({
      teamId: team.id,
      collectionId: collection.id,
    });
    const abilities = serialize(user, document);
    expect(abilities.read).toEqual(true);
    expect(abilities.download).toEqual(true);
    expect(abilities.update).toEqual(true);
    expect(abilities.createChildDocument).toEqual(true);
    expect(abilities.archive).toEqual(true);
    expect(abilities.delete).toEqual(true);
    expect(abilities.share).toEqual(true);
    expect(abilities.move).toEqual(true);
  });
});

describe("read collection", () => {
  it("should allow read only permissions permissions for team member", async () => {
    const team = await buildTeam();
    const user = await buildUser({
      teamId: team.id,
    });
    const collection = await buildCollection({
      teamId: team.id,
      permission: "read",
    });
    const document = await buildDocument({
      teamId: team.id,
      collectionId: collection.id,
    });
    const abilities = serialize(user, document);
    expect(abilities.read).toEqual(true);
    expect(abilities.download).toEqual(true);
    expect(abilities.update).toEqual(false);
    expect(abilities.createChildDocument).toEqual(false);
    expect(abilities.archive).toEqual(false);
    expect(abilities.delete).toEqual(false);
    expect(abilities.share).toEqual(false);
    expect(abilities.move).toEqual(false);
  });
});

describe("private collection", () => {
  it("should allow no permissions for team member", async () => {
    const team = await buildTeam();
    const user = await buildUser({
      teamId: team.id,
    });
    const collection = await buildCollection({
      teamId: team.id,
      permission: null,
    });
    const document = await buildDocument({
      teamId: team.id,
      collectionId: collection.id,
    });
    const abilities = serialize(user, document);
    expect(abilities.read).toEqual(false);
    expect(abilities.download).toEqual(false);
    expect(abilities.update).toEqual(false);
    expect(abilities.createChildDocument).toEqual(false);
    expect(abilities.archive).toEqual(false);
    expect(abilities.delete).toEqual(false);
    expect(abilities.share).toEqual(false);
    expect(abilities.move).toEqual(false);
  });
});
