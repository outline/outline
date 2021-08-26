// @flow
import { subDays } from "date-fns";
import { Attachment, Document } from "../models";
import { buildAttachment, buildTeam, buildDocument } from "../test/factories";
import { flushdb } from "../test/support";
import { teamPermanentDeleter } from "./teamPermanentDeleter";

jest.mock("aws-sdk", () => {
  const mS3 = { deleteObject: jest.fn().mockReturnThis(), promise: jest.fn() };
  return {
    S3: jest.fn(() => mS3),
    Endpoint: jest.fn(),
  };
});

beforeEach(() => flushdb());

describe("teamPermanentDeleter", () => {
  it("should destroy related data", async () => {
    const team = await buildTeam({
      deletedAt: subDays(new Date(), 90),
    });
    await buildDocument({
      teamId: team.id,
    });

    await teamPermanentDeleter(team);

    expect(await Document.unscoped().count({ paranoid: false })).toEqual(0);
  });

  it("should destroy attachments", async () => {
    const team = await buildTeam({
      deletedAt: subDays(new Date(), 90),
    });
    const document = await buildDocument({
      teamId: team.id,
    });
    await buildAttachment({
      teamId: document.teamId,
      documentId: document.id,
    });

    await teamPermanentDeleter(team);

    expect(await Attachment.count()).toEqual(0);
    expect(await Document.unscoped().count({ paranoid: false })).toEqual(0);
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
