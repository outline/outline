import { CollectionUser, Collection } from "@server/models";
import { buildUser, buildTeam, buildCollection } from "@server/test/factories";
import { flushdb } from "@server/test/support";
import { serialize } from "./index";

beforeEach(() => flushdb());

describe("read_write permission", () => {
  it("should allow read write permissions for team member", async () => {
    const team = await buildTeam();
    const user = await buildUser({
      teamId: team.id,
    });
    const collection = await buildCollection({
      teamId: team.id,
      permission: "read_write",
    });
    const abilities = serialize(user, collection);
    expect(abilities.read).toEqual(true);
    expect(abilities.update).toEqual(true);
    expect(abilities.share).toEqual(true);
  });

  it("should override read membership permission", async () => {
    const team = await buildTeam();
    const user = await buildUser({
      teamId: team.id,
    });
    const collection = await buildCollection({
      teamId: team.id,
      permission: "read_write",
    });
    await CollectionUser.create({
      createdById: user.id,
      collectionId: collection.id,
      userId: user.id,
      permission: "read",
    });
    // reload to get membership
    const reloaded = await Collection.scope({
      method: ["withMembership", user.id],
    }).findByPk(collection.id);
    const abilities = serialize(user, reloaded);
    expect(abilities.read).toEqual(true);
    expect(abilities.update).toEqual(true);
    expect(abilities.share).toEqual(true);
  });
});

describe("read permission", () => {
  it("should allow read permissions for team member", async () => {
    const team = await buildTeam();
    const user = await buildUser({
      teamId: team.id,
    });
    const collection = await buildCollection({
      teamId: team.id,
      permission: "read",
    });
    const abilities = serialize(user, collection);
    expect(abilities.read).toEqual(true);
    expect(abilities.update).toEqual(false);
    expect(abilities.share).toEqual(false);
  });

  it("should allow override with read_write membership permission", async () => {
    const team = await buildTeam();
    const user = await buildUser({
      teamId: team.id,
    });
    const collection = await buildCollection({
      teamId: team.id,
      permission: "read",
    });
    await CollectionUser.create({
      createdById: user.id,
      collectionId: collection.id,
      userId: user.id,
      permission: "read_write",
    });
    // reload to get membership
    const reloaded = await Collection.scope({
      method: ["withMembership", user.id],
    }).findByPk(collection.id);
    const abilities = serialize(user, reloaded);
    expect(abilities.read).toEqual(true);
    expect(abilities.update).toEqual(true);
    expect(abilities.share).toEqual(true);
  });
});

describe("no permission", () => {
  it("should allow no permissions for team member", async () => {
    const team = await buildTeam();
    const user = await buildUser({
      teamId: team.id,
    });
    const collection = await buildCollection({
      teamId: team.id,
      permission: null,
    });
    const abilities = serialize(user, collection);
    expect(abilities.read).toEqual(false);
    expect(abilities.update).toEqual(false);
    expect(abilities.share).toEqual(false);
  });

  it("should allow override with team member membership permission", async () => {
    const team = await buildTeam();
    const user = await buildUser({
      teamId: team.id,
    });
    const collection = await buildCollection({
      teamId: team.id,
      permission: null,
    });
    await CollectionUser.create({
      createdById: user.id,
      collectionId: collection.id,
      userId: user.id,
      permission: "read_write",
    });
    // reload to get membership
    const reloaded = await Collection.scope({
      method: ["withMembership", user.id],
    }).findByPk(collection.id);
    const abilities = serialize(user, reloaded);
    expect(abilities.read).toEqual(true);
    expect(abilities.update).toEqual(true);
    expect(abilities.share).toEqual(true);
  });
});
