import { subDays } from "date-fns";
import { Document } from "@server/models";
import { buildDocument, buildTeam } from "@server/test/factories";
import { TeamPreference } from "@shared/types";
import MarkPermanentlyDeletedDocumentsTask from "./MarkPermanentlyDeletedDocumentsTask";

const props = {
  limit: 100,
  partition: {
    partitionIndex: 0,
    partitionCount: 1,
  },
};

describe("MarkPermanentlyDeletedDocumentsTask", () => {
  it("should not mark active documents", async () => {
    const team = await buildTeam();
    await buildDocument({
      teamId: team.id,
      publishedAt: new Date(),
    });

    const task = new MarkPermanentlyDeletedDocumentsTask();
    await task.perform(props);

    const doc = await Document.unscoped().findOne({
      where: { teamId: team.id },
      paranoid: false,
    });
    expect(doc?.permanentlyDeletedAt).toBeNull();
  });

  it("should not mark documents deleted less than 30 days ago (default)", async () => {
    const team = await buildTeam();
    await buildDocument({
      teamId: team.id,
      publishedAt: new Date(),
      deletedAt: subDays(new Date(), 25),
    });

    const task = new MarkPermanentlyDeletedDocumentsTask();
    await task.perform(props);

    const doc = await Document.unscoped().findOne({
      where: { teamId: team.id },
      paranoid: false,
    });
    expect(doc?.permanentlyDeletedAt).toBeNull();
  });

  it("should mark documents deleted more than 30 days ago (default)", async () => {
    const team = await buildTeam();
    await buildDocument({
      teamId: team.id,
      publishedAt: new Date(),
      deletedAt: subDays(new Date(), 31),
    });

    const task = new MarkPermanentlyDeletedDocumentsTask();
    await task.perform(props);

    const doc = await Document.unscoped().findOne({
      where: { teamId: team.id },
      paranoid: false,
    });
    expect(doc?.permanentlyDeletedAt).not.toBeNull();
  });

  it("should respect custom trashRetentionDays", async () => {
    const team = await buildTeam();
    team.setPreference(TeamPreference.TrashRetentionDays, 7);
    await team.save();

    await buildDocument({
      teamId: team.id,
      publishedAt: new Date(),
      deletedAt: subDays(new Date(), 10),
    });

    const task = new MarkPermanentlyDeletedDocumentsTask();
    await task.perform(props);

    const doc = await Document.unscoped().findOne({
      where: { teamId: team.id },
      paranoid: false,
    });
    expect(doc?.permanentlyDeletedAt).not.toBeNull();
  });

  it("should not mark documents if within custom trashRetentionDays", async () => {
    const team = await buildTeam();
    team.setPreference(TeamPreference.TrashRetentionDays, 90);
    await team.save();

    await buildDocument({
      teamId: team.id,
      publishedAt: new Date(),
      deletedAt: subDays(new Date(), 60),
    });

    const task = new MarkPermanentlyDeletedDocumentsTask();
    await task.perform(props);

    const doc = await Document.unscoped().findOne({
      where: { teamId: team.id },
      paranoid: false,
    });
    expect(doc?.permanentlyDeletedAt).toBeNull();
  });
});
