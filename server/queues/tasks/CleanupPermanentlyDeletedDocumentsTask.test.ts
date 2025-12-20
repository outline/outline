import { subDays } from "date-fns";
import { Document } from "@server/models";
import { buildDocument, buildTeam } from "@server/test/factories";
import { TeamPreference } from "@shared/types";
import CleanupPermanentlyDeletedDocumentsTask from "./CleanupPermanentlyDeletedDocumentsTask";

const props = {
  limit: 100,
  partition: {
    partitionIndex: 0,
    partitionCount: 1,
  },
};

describe("CleanupPermanentlyDeletedDocumentsTask", () => {
  it("should not destroy documents not marked for permanent deletion", async () => {
    const team = await buildTeam();
    await buildDocument({
      teamId: team.id,
      publishedAt: new Date(),
      deletedAt: subDays(new Date(), 60),
      permanentlyDeletedAt: null,
    });

    const task = new CleanupPermanentlyDeletedDocumentsTask();
    await task.perform({ ...props, isDefault: true });

    expect(
      await Document.unscoped().count({
        where: {
          teamId: team.id,
        },
        paranoid: false,
      })
    ).toEqual(1);
  });

  it("should not destroy documents marked for permanent deletion less than 30 days ago (default)", async () => {
    const team = await buildTeam();
    await buildDocument({
      teamId: team.id,
      publishedAt: new Date(),
      deletedAt: subDays(new Date(), 60),
      permanentlyDeletedAt: subDays(new Date(), 25),
    });

    const task = new CleanupPermanentlyDeletedDocumentsTask();
    await task.perform({ ...props, isDefault: true });

    expect(
      await Document.unscoped().count({
        where: {
          teamId: team.id,
        },
        paranoid: false,
      })
    ).toEqual(1);
  });

  it("should destroy documents marked for permanent deletion more than 30 days ago (default)", async () => {
    const team = await buildTeam();
    await buildDocument({
      teamId: team.id,
      publishedAt: new Date(),
      deletedAt: subDays(new Date(), 60),
      permanentlyDeletedAt: subDays(new Date(), 31),
    });

    const task = new CleanupPermanentlyDeletedDocumentsTask();
    await task.perform({ ...props, isDefault: true });

    expect(
      await Document.unscoped().count({
        where: {
          teamId: team.id,
        },
        paranoid: false,
      })
    ).toEqual(0);
  });

  it("should respect custom documentRetentionDays", async () => {
    const retentionDays = 7;
    const team = await buildTeam();
    team.setPreference(TeamPreference.DataRetentionDays, retentionDays);
    await team.save();

    await buildDocument({
      teamId: team.id,
      publishedAt: new Date(),
      deletedAt: subDays(new Date(), 60),
      permanentlyDeletedAt: subDays(new Date(), 10),
    });

    const task = new CleanupPermanentlyDeletedDocumentsTask();
    await task.perform({ ...props, retentionDays });

    expect(
      await Document.unscoped().count({
        where: {
          teamId: team.id,
        },
        paranoid: false,
      })
    ).toEqual(0);
  });

  it("should not destroy documents if within custom documentRetentionDays", async () => {
    const retentionDays = 90;
    const team = await buildTeam();
    team.setPreference(TeamPreference.DataRetentionDays, retentionDays);
    await team.save();

    await buildDocument({
      teamId: team.id,
      publishedAt: new Date(),
      deletedAt: subDays(new Date(), 60),
      permanentlyDeletedAt: subDays(new Date(), 45),
    });

    const task = new CleanupPermanentlyDeletedDocumentsTask();
    await task.perform({ ...props, retentionDays });

    expect(
      await Document.unscoped().count({
        where: {
          teamId: team.id,
        },
        paranoid: false,
      })
    ).toEqual(1);
  });
});
