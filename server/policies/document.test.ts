import { CollectionPermission } from "@shared/types";
import {
  buildUser,
  buildTeam,
  buildDocument,
  buildDraftDocument,
  buildCollection,
} from "@server/test/factories";
import { serialize } from "./index";

describe("read_write collection", () => {
  it("should allow read write permissions for member", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      teamId: team.id,
      permission: CollectionPermission.ReadWrite,
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
    expect(abilities.comment).toEqual(true);
  });

  it("should allow read permissions for viewer", async () => {
    const team = await buildTeam();
    const user = await buildUser({
      teamId: team.id,
      isViewer: true,
    });
    const collection = await buildCollection({
      teamId: team.id,
      permission: CollectionPermission.ReadWrite,
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
    expect(abilities.subscribe).toEqual(true);
    expect(abilities.unsubscribe).toEqual(true);
    expect(abilities.comment).toEqual(true);
  });
});

describe("read collection", () => {
  it("should allow read permissions for team member", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      teamId: team.id,
      permission: CollectionPermission.Read,
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
    expect(abilities.subscribe).toEqual(true);
    expect(abilities.unsubscribe).toEqual(true);
    expect(abilities.comment).toEqual(true);
  });
});

describe("private collection", () => {
  it("should allow no permissions for team member", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
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
    expect(abilities.subscribe).toEqual(false);
    expect(abilities.unsubscribe).toEqual(false);
    expect(abilities.comment).toEqual(false);
  });
});

describe("no collection", () => {
  it("should grant same permissions as that on a draft document except the share permission", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const document = await buildDraftDocument({
      teamId: team.id,
      collectionId: null,
    });
    const abilities = serialize(user, document);
    expect(abilities.archive).toEqual(false);
    expect(abilities.createChildDocument).toEqual(false);
    expect(abilities.delete).toEqual(true);
    expect(abilities.download).toEqual(true);
    expect(abilities.move).toEqual(true);
    expect(abilities.permanentDelete).toEqual(false);
    expect(abilities.pin).toEqual(false);
    expect(abilities.pinToHome).toEqual(false);
    expect(abilities.read).toEqual(true);
    expect(abilities.restore).toEqual(false);
    expect(abilities.share).toEqual(true);
    expect(abilities.star).toEqual(true);
    expect(abilities.subscribe).toEqual(false);
    expect(abilities.unarchive).toEqual(false);
    expect(abilities.unpin).toEqual(false);
    expect(abilities.unpublish).toEqual(false);
    expect(abilities.unstar).toEqual(true);
    expect(abilities.unsubscribe).toEqual(false);
    expect(abilities.update).toEqual(true);
    expect(abilities.comment).toEqual(true);
  });
});
