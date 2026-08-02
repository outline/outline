import { Op } from "sequelize";
import { subDays } from "date-fns";
import { Document } from "@server/models";
import { sequelize } from "@server/storage/database";
import { buildDocument, buildTeam } from "@server/test/factories";
import { TeamPreferenceDefaults } from "@shared/constants";
import { TeamPreference } from "@shared/types";
import ExpireDocumentsInTrashByRetentionTask from "./ExpireDocumentsInTrashByRetentionTask";

const props = {
  limit: 100,
  partition: {
    partitionIndex: 0,
    partitionCount: 1,
  },
};

const defaultRetentionDays = TeamPreferenceDefaults[
  TeamPreference.TrashRetentionDays
] as number;

describe("ExpireDocumentsInTrashByRetentionTask", () => {
  it("should not mark active documents", async () => {
    const team = await buildTeam();
    await buildDocument({
      teamId: team.id,
      publishedAt: new Date(),
    });

    const task = new ExpireDocumentsInTrashByRetentionTask();
    await task.perform({ ...props, retentionDays: defaultRetentionDays });

    const doc = await Document.unscoped().findOne({
      where: { teamId: team.id },
      paranoid: false,
    });
    expect(doc?.destroyedAt).toBeNull();
  });

  it("should not mark documents deleted less than 30 days ago (default)", async () => {
    const team = await buildTeam();
    await buildDocument({
      teamId: team.id,
      publishedAt: new Date(),
      deletedAt: subDays(new Date(), defaultRetentionDays - 5),
    });

    const task = new ExpireDocumentsInTrashByRetentionTask();
    await task.perform({ ...props, retentionDays: defaultRetentionDays });

    const doc = await Document.unscoped().findOne({
      where: { teamId: team.id },
      paranoid: false,
    });
    expect(doc?.destroyedAt).toBeNull();
  });

  it("should mark documents deleted more than 30 days ago (default)", async () => {
    const team = await buildTeam();
    await buildDocument({
      teamId: team.id,
      publishedAt: new Date(),
      deletedAt: subDays(new Date(), defaultRetentionDays + 1),
    });

    const task = new ExpireDocumentsInTrashByRetentionTask();
    await task.perform({ ...props, retentionDays: defaultRetentionDays });

    const doc = await Document.unscoped().findOne({
      where: { teamId: team.id },
      paranoid: false,
    });
    expect(doc?.destroyedAt).not.toBeNull();
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

    const task = new ExpireDocumentsInTrashByRetentionTask();
    await task.perform({ ...props, retentionDays });

    const doc = await Document.unscoped().findOne({
      where: { teamId: team.id },
      paranoid: false,
    });
    expect(doc?.destroyedAt).not.toBeNull();
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

    const task = new ExpireDocumentsInTrashByRetentionTask();
    await task.perform({ ...props, retentionDays });

    const doc = await Document.unscoped().findOne({
      where: { teamId: team.id },
      paranoid: false,
    });
    expect(doc?.destroyedAt).toBeNull();
  });

  it("should not mark documents for a team with a custom period when processing the default tranche", async () => {
    const team = await buildTeam();
    team.setPreference(TeamPreference.TrashRetentionDays, 90);
    await team.save();

    await buildDocument({
      teamId: team.id,
      publishedAt: new Date(),
      deletedAt: subDays(new Date(), defaultRetentionDays + 1),
    });

    const task = new ExpireDocumentsInTrashByRetentionTask();
    await task.perform({ ...props, retentionDays: defaultRetentionDays });

    const doc = await Document.unscoped().findOne({
      where: { teamId: team.id },
      paranoid: false,
    });
    expect(doc?.destroyedAt).toBeNull();
  });

  it("should never mark documents when retention is infinite", async () => {
    const team = await buildTeam();
    team.setPreference(TeamPreference.TrashRetentionDays, 0);
    await team.save();

    await buildDocument({
      teamId: team.id,
      publishedAt: new Date(),
      deletedAt: subDays(new Date(), 365),
    });

    const task = new ExpireDocumentsInTrashByRetentionTask();
    await task.perform({ ...props, retentionDays: 0 });

    const doc = await Document.unscoped().findOne({
      where: { teamId: team.id },
      paranoid: false,
    });
    expect(doc?.destroyedAt).toBeNull();
  });

  it("should not mark more documents than the limit allows", async () => {
    const team = await buildTeam();
    await Promise.all(
      [1, 2, 3].map(() =>
        buildDocument({
          teamId: team.id,
          publishedAt: new Date(),
          deletedAt: subDays(new Date(), defaultRetentionDays + 1),
        })
      )
    );

    const task = new ExpireDocumentsInTrashByRetentionTask();
    await task.perform({
      ...props,
      limit: 2,
      retentionDays: defaultRetentionDays,
    });

    expect(
      await Document.unscoped().count({
        where: { teamId: team.id, destroyedAt: { [Op.ne]: null } },
        paranoid: false,
      })
    ).toEqual(2);
  });

  it("should tolerate a team holding an unexpected retention value", async () => {
    // Preferences are free-form JSON, a value that cannot be read as a number
    // must not fail the query for every other team in the batch.
    const team = await buildTeam();
    await sequelize.query(
      `UPDATE teams SET preferences = jsonb_set(coalesce(preferences, '{}'::jsonb), :path, '"not-a-number"') WHERE id = :id`,
      {
        replacements: {
          path: `{${TeamPreference.TrashRetentionDays}}`,
          id: team.id,
        },
      }
    );

    const other = await buildTeam();
    await buildDocument({
      teamId: other.id,
      publishedAt: new Date(),
      deletedAt: subDays(new Date(), defaultRetentionDays + 1),
    });

    const task = new ExpireDocumentsInTrashByRetentionTask();
    await task.perform({ ...props, retentionDays: defaultRetentionDays });

    const doc = await Document.unscoped().findOne({
      where: { teamId: other.id },
      paranoid: false,
    });
    expect(doc?.destroyedAt).not.toBeNull();
  });
});
