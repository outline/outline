import { renderToStaticMarkup } from "react-dom/server";
import { CollectionPermission, DocumentPermission } from "@shared/types";
import mailer from "@server/emails/mailer";
import { UserMembership } from "@server/models";
import {
  buildCollection,
  buildDocument,
  buildGroup,
  buildUser,
} from "@server/test/factories";
import CollectionSharedEmail from "./CollectionSharedEmail";
import DocumentAccessRequestEmail from "./DocumentAccessRequestEmail";
import DocumentMentionedEmail from "./DocumentMentionedEmail";
import DocumentSharedEmail from "./DocumentSharedEmail";
import GroupDocumentMentionedEmail from "./GroupDocumentMentionedEmail";

const teamUrl = "https://example.outline.dev";

describe("notification emails", () => {
  beforeEach(() => {
    vi.spyOn(mailer, "sendMail").mockResolvedValue();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const expectUnsubscribe = (eventType: string, userId: string) => {
    expect(mailer.sendMail).toHaveBeenCalledTimes(1);
    const options = vi.mocked(mailer.sendMail).mock.calls[0][0];
    expect(options.unsubscribeUrl).toContain(`userId=${userId}`);
    expect(options.unsubscribeUrl).toContain(`eventType=${eventType}`);
  };

  it("should include an unsubscribe link in DocumentMentionedEmail", async () => {
    const user = await buildUser();
    const document = await buildDocument({ teamId: user.teamId });

    await new DocumentMentionedEmail({
      to: user.email,
      userId: user.id,
      documentId: document.id,
      revisionId: undefined,
      actorName: "Actor",
      teamUrl,
    }).send();

    expectUnsubscribe("documents.mentioned", user.id);
  });

  it("should include an unsubscribe link in GroupDocumentMentionedEmail", async () => {
    const user = await buildUser();
    const group = await buildGroup({ teamId: user.teamId });
    const document = await buildDocument({ teamId: user.teamId });

    await new GroupDocumentMentionedEmail({
      to: user.email,
      userId: user.id,
      documentId: document.id,
      revisionId: undefined,
      groupId: group.id,
      actorName: "Actor",
      teamUrl,
    }).send();

    expectUnsubscribe("documents.group_mentioned", user.id);
  });

  it("should include an unsubscribe link in DocumentSharedEmail", async () => {
    const user = await buildUser();
    const document = await buildDocument({ teamId: user.teamId });
    const membership = await UserMembership.create({
      userId: user.id,
      documentId: document.id,
      createdById: document.createdById,
      permission: DocumentPermission.Read,
    });

    await new DocumentSharedEmail({
      to: user.email,
      userId: user.id,
      documentId: document.id,
      membershipId: membership.id,
      actorName: "Actor",
      teamUrl,
    }).send();

    expectUnsubscribe("documents.add_user", user.id);
  });

  it("should include an unsubscribe link in CollectionSharedEmail", async () => {
    const user = await buildUser();
    const collection = await buildCollection({ teamId: user.teamId });
    await UserMembership.create({
      userId: user.id,
      collectionId: collection.id,
      createdById: collection.createdById,
      permission: CollectionPermission.Read,
    });

    await new CollectionSharedEmail({
      to: user.email,
      userId: user.id,
      collectionId: collection.id,
      actorName: "Actor",
      teamUrl,
    }).send();

    expectUnsubscribe("collections.add_user", user.id);
  });

  it("should include an unsubscribe link in DocumentAccessRequestEmail", async () => {
    const user = await buildUser();
    const actor = await buildUser({ teamId: user.teamId });
    const document = await buildDocument({ teamId: user.teamId });

    await new DocumentAccessRequestEmail({
      to: user.email,
      userId: user.id,
      documentId: document.id,
      actorId: actor.id,
      teamUrl,
    }).send();

    expectUnsubscribe("access_requests.create", user.id);
  });

  it("should set the language and direction for RTL languages", async () => {
    const user = await buildUser({ language: "he_IL" });
    const actor = await buildUser({ teamId: user.teamId });
    const document = await buildDocument({ teamId: user.teamId });

    await new DocumentAccessRequestEmail({
      to: user.email,
      language: user.language,
      userId: user.id,
      documentId: document.id,
      actorId: actor.id,
      teamUrl,
    }).send();

    const options = vi.mocked(mailer.sendMail).mock.calls[0][0];
    expect(options.lang).toEqual("he-IL");
    expect(options.dir).toEqual("rtl");
    expect(renderToStaticMarkup(options.component)).toContain('align="right"');
  });

  it("should set the language and direction for LTR languages", async () => {
    const user = await buildUser({ language: "en_US" });
    const document = await buildDocument({ teamId: user.teamId });

    await new DocumentMentionedEmail({
      to: user.email,
      language: user.language,
      userId: user.id,
      documentId: document.id,
      revisionId: undefined,
      actorName: "Actor",
      teamUrl,
    }).send();

    const options = vi.mocked(mailer.sendMail).mock.calls[0][0];
    expect(options.lang).toEqual("en-US");
    expect(options.dir).toEqual("ltr");
    expect(renderToStaticMarkup(options.component)).toContain('align="left"');
  });
});
