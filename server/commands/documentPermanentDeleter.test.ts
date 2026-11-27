import { subDays } from "date-fns";
import { errToString } from "@shared/utils/error";
import { parser } from "@server/editor";
import { Attachment, Document } from "@server/models";
import {
  buildAttachment,
  buildDocument,
  buildDraftDocument,
} from "@server/test/factories";
import { mockTaskSchedule } from "@server/test/support";
import documentPermanentDeleter from "./documentPermanentDeleter";

const schedule = mockTaskSchedule();

describe("documentPermanentDeleter", () => {
  it("should destroy documents", async () => {
    const document = await buildDocument({
      publishedAt: subDays(new Date(), 90),
      deletedAt: new Date(),
    });
    const countDeletedDoc = await documentPermanentDeleter([document]);
    expect(countDeletedDoc).toEqual(1);
    expect(
      await Document.unscoped().count({
        where: {
          teamId: document.teamId,
        },
        paranoid: false,
      })
    ).toEqual(0);
  });

  it("should error when trying to destroy undeleted documents", async () => {
    const document = await buildDocument({
      publishedAt: new Date(),
    });
    let error;

    try {
      await documentPermanentDeleter([document]);
    } catch (err) {
      error = errToString(err);
    }

    expect(error).toEqual(
      `Cannot permanently delete ${document.id} document. Please delete it and try again.`
    );
  });

  it("should destroy attachments no longer referenced", async () => {
    const document = await buildDocument({
      publishedAt: subDays(new Date(), 90),
      deletedAt: new Date(),
    });
    const attachment = await buildAttachment({
      teamId: document.teamId,
      documentId: document.id,
    });
    await buildAttachment({
      teamId: document.teamId,
      documentId: document.id,
    });
    document.text = `![text](${attachment.redirectUrl})`;
    await document.save();
    const countDeletedDoc = await documentPermanentDeleter([document]);
    expect(countDeletedDoc).toEqual(1);
    expect(schedule).toHaveBeenCalledTimes(2);
    expect(
      await Document.unscoped().count({
        where: {
          teamId: document.teamId,
        },
        paranoid: false,
      })
    ).toEqual(0);
  });

  it("should handle unknown attachment ids", async () => {
    const document = await buildDocument({
      publishedAt: subDays(new Date(), 90),
      deletedAt: new Date(),
    });
    const attachment = await buildAttachment({
      teamId: document.teamId,
      documentId: document.id,
    });
    document.text = `![text](${attachment.redirectUrl})`;
    await document.save();
    // remove attachment so it no longer exists in the database, this is also
    // representative of a corrupt attachment id in the doc or the regex returning
    // an incorrect string
    await attachment.destroy({
      force: true,
    });
    const countDeletedDoc = await documentPermanentDeleter([document]);
    expect(countDeletedDoc).toEqual(1);
    expect(
      await Attachment.count({
        where: {
          teamId: document.teamId,
        },
      })
    ).toEqual(0);
    expect(
      await Document.unscoped().count({
        where: {
          teamId: document.teamId,
        },
        paranoid: false,
      })
    ).toEqual(0);
  });

  it("should not destroy a document restored between query and destroy", async () => {
    const document = await buildDocument({
      publishedAt: subDays(new Date(), 90),
      deletedAt: subDays(new Date(), 60),
    });

    // Simulate the race: caller queried this document while it was soft-deleted,
    // but the user restored it before documentPermanentDeleter runs the destroy.
    await Document.unscoped().update(
      { deletedAt: null },
      { where: { id: document.id }, paranoid: false }
    );

    // The stale in-memory object still has deletedAt set (as it would in the
    // real cleanup task flow), but the DB row is now active.
    const countDeletedDoc = await documentPermanentDeleter([document]);
    expect(countDeletedDoc).toEqual(0);

    // Document must survive — it was restored.
    expect(
      await Document.unscoped().count({
        where: { id: document.id },
        paranoid: false,
      })
    ).toEqual(1);
  });

  it("should not detach children of a document restored between query and destroy", async () => {
    const parent = await buildDocument({
      publishedAt: subDays(new Date(), 90),
      deletedAt: subDays(new Date(), 60),
    });
    const child = await buildDocument({
      teamId: parent.teamId,
      parentDocumentId: parent.id,
    });

    await Document.unscoped().update(
      { deletedAt: null },
      { where: { id: parent.id }, paranoid: false }
    );

    await documentPermanentDeleter([parent]);

    await child.reload();
    expect(child.parentDocumentId).toEqual(parent.id);
  });

  it("should detach draft children rather than cascade delete them", async () => {
    const parent = await buildDocument({
      publishedAt: subDays(new Date(), 90),
      deletedAt: subDays(new Date(), 60),
    });
    const child = await buildDraftDocument({
      teamId: parent.teamId,
      parentDocumentId: parent.id,
    });

    const countDeletedDoc = await documentPermanentDeleter([parent]);
    expect(countDeletedDoc).toEqual(1);

    const reloaded = await Document.unscoped().findByPk(child.id);
    expect(reloaded?.parentDocumentId).toEqual(null);
  });

  it("should not destroy attachments referenced in other documents", async () => {
    const document1 = await buildDocument();
    const document = await buildDocument({
      teamId: document1.teamId,
      publishedAt: subDays(new Date(), 90),
      deletedAt: subDays(new Date(), 60),
    });
    const attachment = await buildAttachment({
      teamId: document1.teamId,
      documentId: document.id,
    });
    document1.text = `![text](${attachment.redirectUrl})`;
    await document1.save();
    document.text = `![text](${attachment.redirectUrl})`;
    await document.save();
    expect(
      await Attachment.count({
        where: {
          teamId: document.teamId,
        },
      })
    ).toEqual(1);
    const countDeletedDoc = await documentPermanentDeleter([document]);
    expect(countDeletedDoc).toEqual(1);
    expect(
      await Attachment.count({
        where: {
          teamId: document.teamId,
        },
      })
    ).toEqual(1);
    expect(
      await Document.unscoped().count({
        where: {
          teamId: document.teamId,
        },
        paranoid: false,
      })
    ).toEqual(1);
  });

  it("should destroy attachments referenced only by documents in the same batch", async () => {
    const document1 = await buildDocument({
      publishedAt: subDays(new Date(), 90),
      deletedAt: subDays(new Date(), 60),
    });
    const document2 = await buildDocument({
      teamId: document1.teamId,
      publishedAt: subDays(new Date(), 90),
      deletedAt: subDays(new Date(), 60),
    });
    const attachment = await buildAttachment({
      teamId: document1.teamId,
      documentId: document1.id,
    });
    document1.text = `![text](${attachment.redirectUrl})`;
    await document1.save();
    document2.text = `![text](${attachment.redirectUrl})`;
    await document2.save();

    const countDeletedDoc = await documentPermanentDeleter([
      document1,
      document2,
    ]);
    expect(countDeletedDoc).toEqual(2);
    expect(schedule).toHaveBeenCalledTimes(1);
    expect(schedule).toHaveBeenCalledWith(
      expect.objectContaining({ attachmentId: attachment.id })
    );
  });

  it("should only schedule deletion of attachments owned by the document's team", async () => {
    const otherTeamDocument = await buildDocument({
      publishedAt: subDays(new Date(), 90),
      deletedAt: subDays(new Date(), 60),
    });
    const document = await buildDocument({
      publishedAt: subDays(new Date(), 90),
      deletedAt: subDays(new Date(), 60),
    });
    const attachment = await buildAttachment({
      teamId: document.teamId,
      documentId: document.id,
    });
    const content = parser
      .parse(`![text](${attachment.redirectUrl})`)
      ?.toJSON();
    otherTeamDocument.content = content;
    await otherTeamDocument.save();
    document.content = content;
    await document.save();

    await documentPermanentDeleter([otherTeamDocument, document]);
    expect(schedule).toHaveBeenCalledTimes(1);
    expect(schedule).toHaveBeenCalledWith({
      attachmentId: attachment.id,
      teamId: document.teamId,
    });
  });
});
