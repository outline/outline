import { Document } from "@server/models";
import { buildDocument, buildTeam } from "@server/test/factories";
import { mockTaskSchedule } from "@server/test/support";
import EmptyTrashTask from "./EmptyTrashTask";

mockTaskSchedule();

describe("EmptyTrashTask", () => {
  it("should destroy deleted documents and keep others", async () => {
    const team = await buildTeam();
    const deleted = await Promise.all(
      [1, 2, 3].map(() =>
        buildDocument({ teamId: team.id, deletedAt: new Date() })
      )
    );
    const active = await buildDocument({ teamId: team.id });

    await new EmptyTrashTask().perform({
      documentIds: [...deleted.map((doc) => doc.id), active.id],
    });

    const remaining = await Document.unscoped().findAll({
      attributes: ["id"],
      where: { teamId: team.id },
      paranoid: false,
    });
    expect(remaining.map((doc) => doc.id)).toEqual([active.id]);
  });
});
