import { renderToStaticMarkup } from "react-dom/server";
import { NotificationEventType, TeamPreference } from "@shared/types";
import { createContext } from "@server/context";
import mailer from "@server/emails/mailer";
import env from "@server/env";
import { Revision } from "@server/models";
import {
  buildCollection,
  buildDocument,
  buildTeam,
  buildUser,
} from "@server/test/factories";
import { initI18n } from "@server/utils/i18n";
import DocumentPublishedOrUpdatedEmail from "./DocumentPublishedOrUpdatedEmail";

describe("DocumentPublishedOrUpdatedEmail", () => {
  beforeAll(async () => {
    await initI18n();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function sendEmail(
    eventType:
      | NotificationEventType.PublishDocument
      | NotificationEventType.UpdateDocument,
    collaboratorCount: number,
    { withActorId = true } = {}
  ) {
    const spy = vi.spyOn(mailer, "sendMail").mockResolvedValue(undefined);
    const team = await buildTeam();
    const [actor, ...others] = await Promise.all(
      Array.from({ length: collaboratorCount }, (_, index) =>
        buildUser({ teamId: team.id, name: `User ${index + 1}` })
      )
    );
    const recipient = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      teamId: team.id,
      userId: actor.id,
      lastModifiedById: actor.id,
    });
    const revision = await Revision.createFromDocument(
      createContext({ user: actor }),
      document,
      [actor.id, ...others.map((user) => user.id)]
    );

    await new DocumentPublishedOrUpdatedEmail({
      to: recipient.email,
      userId: recipient.id,
      eventType,
      revisionId: revision.id,
      documentId: document.id,
      teamUrl: team.url,
      actorId: withActorId ? actor.id : undefined,
      actorName: actor.name,
    }).send();

    expect(spy).toHaveBeenCalledTimes(1);
    return spy.mock.calls[0][0];
  }

  it("should name the actor when they are the only collaborator", async () => {
    const mail = await sendEmail(NotificationEventType.UpdateDocument, 1);

    expect(mail.previewText).toEqual("User 1 updated a document");
    expect(mail.text).toContain("User 1 updated the document");
  });

  it("should list every collaborator on an update", async () => {
    const mail = await sendEmail(NotificationEventType.UpdateDocument, 3);

    expect(mail.previewText).toEqual(
      "User 1, User 2, and User 3 updated a document"
    );
    expect(mail.text).toContain("User 1, User 2, and User 3 updated the");
  });

  it("should send from the actor only", async () => {
    const mail = await sendEmail(NotificationEventType.UpdateDocument, 2);

    expect(mail.from.name).toEqual(`User 1 via ${env.APP_NAME}`);
  });

  it("should name only the actor on publish", async () => {
    const mail = await sendEmail(NotificationEventType.PublishDocument, 2);

    expect(mail.previewText).toEqual("User 1 published a document");
  });

  it("should include a preview of the document on publish", async () => {
    const spy = vi.spyOn(mailer, "sendMail").mockResolvedValue(undefined);
    const team = await buildTeam();
    const actor = await buildUser({ teamId: team.id });
    const recipient = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      teamId: team.id,
      userId: actor.id,
      text: "First paragraph\n\nSecond paragraph\n\nThird paragraph\n\nFourth paragraph",
    });

    await new DocumentPublishedOrUpdatedEmail({
      to: recipient.email,
      userId: recipient.id,
      eventType: NotificationEventType.PublishDocument,
      documentId: document.id,
      teamUrl: team.url,
      actorId: actor.id,
      actorName: actor.name,
    }).send();

    const html = renderToStaticMarkup(spy.mock.calls[0][0].component);
    expect(html).toContain("First paragraph");
    expect(html).toContain("Third paragraph");
    expect(html).not.toContain("Fourth paragraph");
  });

  it("should not include a preview when previews are disabled", async () => {
    const spy = vi.spyOn(mailer, "sendMail").mockResolvedValue(undefined);
    const team = await buildTeam();
    team.setPreference(TeamPreference.PreviewsInEmails, false);
    await team.save();
    const actor = await buildUser({ teamId: team.id });
    const recipient = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      teamId: team.id,
      userId: actor.id,
      text: "First paragraph",
    });

    await new DocumentPublishedOrUpdatedEmail({
      to: recipient.email,
      userId: recipient.id,
      eventType: NotificationEventType.PublishDocument,
      documentId: document.id,
      teamUrl: team.url,
      actorId: actor.id,
      actorName: actor.name,
    }).send();

    const html = renderToStaticMarkup(spy.mock.calls[0][0].component);
    expect(html).not.toContain("First paragraph");
  });

  it("should make relative links in the preview absolute", async () => {
    const spy = vi.spyOn(mailer, "sendMail").mockResolvedValue(undefined);
    const team = await buildTeam();
    const actor = await buildUser({ teamId: team.id });
    const recipient = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      teamId: team.id,
      userId: actor.id,
      text: "See [another doc](/doc/another-abc123)",
    });

    await new DocumentPublishedOrUpdatedEmail({
      to: recipient.email,
      userId: recipient.id,
      eventType: NotificationEventType.PublishDocument,
      documentId: document.id,
      teamUrl: team.url,
      actorId: actor.id,
      actorName: actor.name,
    }).send();

    const html = renderToStaticMarkup(spy.mock.calls[0][0].component);
    expect(html).toContain(`${team.url}/doc/another-abc123`);
  });

  it("should not send when the recipient cannot read the document", async () => {
    const spy = vi.spyOn(mailer, "sendMail").mockResolvedValue(undefined);
    const team = await buildTeam();
    const actor = await buildUser({ teamId: team.id });
    const recipient = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      teamId: team.id,
      userId: actor.id,
      permission: null,
    });
    const document = await buildDocument({
      teamId: team.id,
      userId: actor.id,
      collectionId: collection.id,
    });

    await new DocumentPublishedOrUpdatedEmail({
      to: recipient.email,
      userId: recipient.id,
      eventType: NotificationEventType.PublishDocument,
      documentId: document.id,
      teamUrl: team.url,
      actorId: actor.id,
      actorName: actor.name,
    }).send();

    expect(spy).not.toHaveBeenCalled();
  });

  it("should name only the actor when the actor ID is missing", async () => {
    const mail = await sendEmail(NotificationEventType.UpdateDocument, 2, {
      withActorId: false,
    });

    expect(mail.previewText).toEqual("User 1 updated a document");
  });
});
