import { subDays } from "date-fns";
import { Document } from "@server/models";
import { buildDocument, buildTeam } from "@server/test/factories";
import { TeamPreference } from "@shared/types";
import ExpireDocumentsInTrashTask from "./ExpireDocumentsInTrashTask";

const props = {
  limit: 100,
  partition: {
    partitionIndex: 0,
    partitionCount: 1,
  },
};

describe("ExpireDocumentsInTrashTask", () => {
  it("should not mark active documents", async () => {
    const team = await buildTeam();
    await buildDocument({
      teamId: team.id,
      publishedAt: new Date(),
    });

    const task = new ExpireDocumentsInTrashTask();
    await task.perform({ ...props, isDefault: true });

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

    const task = new ExpireDocumentsInTrashTask();
    await task.perform({ ...props, isDefault: true });

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

    const task = new ExpireDocumentsInTrashTask();
    await task.perform({ ...props, isDefault: true });

    const doc = await Document.unscoped().findOne({
      where: { teamId: team.id },
      paranoid: false,
    });
    expect(doc?.permanentlyDeletedAt).not.toBeNull();
  });

  it("should respect custom trashRetentionDays", async () => {
    const retentionDays = 7;
    const team = await buildTeam();
    team.setPreference(TeamPreference.TrashRetentionDays, retentionDays);
    await team.save();

    await buildDocument({
      teamId: team.id,
      publishedAt: new Date(),
      deletedAt: subDays(new Date(), 10),
    });

    const task = new ExpireDocumentsInTrashTask();
    await task.perform({ ...props, retentionDays });

    const doc = await Document.unscoped().findOne({
      where: { teamId: team.id },
      paranoid: false,
    });
    expect(doc?.permanentlyDeletedAt).not.toBeNull();
  });

  it("should not mark documents if within custom trashRetentionDays", async () => {
    const retentionDays = 90;
    const team = await buildTeam();
    team.setPreference(TeamPreference.TrashRetentionDays, retentionDays);
    await team.save();

    await buildDocument({
      teamId: team.id,
      publishedAt: new Date(),
      deletedAt: subDays(new Date(), 60),
    });

    const task = new ExpireDocumentsInTrashTask();
    await task.perform({ ...props, retentionDays });

    const doc = await Document.unscoped().findOne({
      where: { teamId: team.id },
      paranoid: false,
    });
    expect(doc?.permanentlyDeletedAt).toBeNull();
  });
});
