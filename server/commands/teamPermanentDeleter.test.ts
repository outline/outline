import { subDays } from "date-fns";
import { Attachment, User, Document, Collection, Team } from "@server/models";
import {
  buildAttachment,
  buildUser,
  buildTeam,
  buildDocument,
} from "@server/test/factories";
import teamPermanentDeleter from "./teamPermanentDeleter";

describe("teamPermanentDeleter", () => {
  it("should destroy related data", async () => {
    const team = await buildTeam({
      deletedAt: subDays(new Date(), 90),
    });
    const user = await buildUser({ teamId: team.id });
    await buildDocument({
      teamId: team.id,
      userId: user.id,
    });
    await teamPermanentDeleter(team);
    expect(
      await Team.count({
        where: {
          id: team.id,
        },
      })
    ).toEqual(0);
    expect(
      await User.count({
        where: {
          teamId: team.id,
        },
      })
    ).toEqual(0);
    expect(
      await Document.unscoped().count({
        where: {
          teamId: team.id,
        },
        paranoid: false,
      })
    ).toEqual(0);
    expect(
      await Collection.unscoped().count({
        where: {
          teamId: team.id,
        },
        paranoid: false,
      })
    ).toEqual(0);
  });

  it("should not destroy unrelated data", async () => {
    const team = await buildTeam({
      deletedAt: subDays(new Date(), 90),
    });
    await buildUser();
    await buildTeam();
    const document = await buildDocument();
    await teamPermanentDeleter(team);
    expect(
      await Document.unscoped().count({
        where: {
          id: document.id,
        },
        paranoid: false,
      })
    ).toEqual(1);
    expect(
      await Collection.unscoped().count({
        where: {
          // buildDocument() above guarantees this to be non-null
          id: document.collectionId!,
        },
        paranoid: false,
      })
    ).toEqual(1);
  });

  it("should destroy attachments", async () => {
    const team = await buildTeam({
      deletedAt: subDays(new Date(), 90),
    });
    const user = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      teamId: team.id,
      userId: user.id,
    });
    await buildAttachment({
      teamId: document.teamId,
      documentId: document.id,
    });
    await teamPermanentDeleter(team);
    expect(
      await Team.count({
        where: {
          id: team.id,
        },
      })
    ).toEqual(0);
    expect(
      await User.count({
        where: {
          teamId: team.id,
        },
      })
    ).toEqual(0);
    expect(
      await Attachment.count({
        where: {
          teamId: team.id,
        },
      })
    ).toEqual(0);
    expect(
      await Document.unscoped().count({
        where: {
          teamId: team.id,
        },
        paranoid: false,
      })
    ).toEqual(0);
    expect(
      await Collection.unscoped().count({
        where: {
          teamId: team.id,
        },
        paranoid: false,
      })
    ).toEqual(0);
  });

  it("should error when trying to destroy undeleted team", async () => {
    const team = await buildTeam();
    let error;

    try {
      await teamPermanentDeleter(team);
    } catch (err) {
      error = err.message;
    }

    expect(error).toEqual(
      `Cannot permanently delete ${team.id} team. Please delete it and try again.`
    );
  });
});
