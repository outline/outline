import { Document } from "@server/models";
import { buildDocument, buildDraftDocument } from "@server/test/factories";
import { setupTestDatabase } from "@server/test/support";
import script from "./20230803172011-migrate-emoji-in-document-title";

setupTestDatabase();

describe("#work", () => {
  it("should correctly update title and emoji for a draft document", async () => {
    const document = await buildDraftDocument({
      title: "😵 Title draft",
    });
    expect(document.publishedAt).toBeNull();
    expect(document.emoji).toBeNull();

    await script();
    const draft = await Document.unscoped().findByPk(document.id);
    expect(draft).not.toBeNull();
    expect(draft?.title).toEqual("Title draft");
    expect(draft?.emoji).toEqual("😵");
  });

  it("should correctly update title and emoji for a published document", async () => {
    const document = await buildDocument({
      title: "👱🏽‍♀️ Title published",
    });
    expect(document.publishedAt).toBeTruthy();
    expect(document.emoji).toBeNull();

    await script();
    const published = await Document.unscoped().findByPk(document.id);
    expect(published).not.toBeNull();
    expect(published?.title).toEqual("Title published");
    expect(published?.emoji).toEqual("👱🏽‍♀️");
  });

  it("should correctly update title and emoji for an archived document", async () => {
    const document = await buildDocument({
      title: "🍇 Title archived",
    });
    await document.archive(document.createdById);
    expect(document.archivedAt).toBeTruthy();
    expect(document.emoji).toBeNull();

    await script();
    const archived = await Document.unscoped().findByPk(document.id);
    expect(archived).not.toBeNull();
    expect(archived?.title).toEqual("Title archived");
    expect(archived?.emoji).toEqual("🍇");
  });

  it("should correctly update title and emoji for a template", async () => {
    const document = await buildDocument({
      title: "🐹 Title template",
      template: true,
    });
    expect(document.template).toBe(true);
    expect(document.emoji).toBeNull();

    await script();
    const template = await Document.unscoped().findByPk(document.id);
    expect(template).not.toBeNull();
    expect(template?.title).toEqual("Title template");
    expect(template?.emoji).toEqual("🐹");
  });

  it("should correctly update title and emoji for a deleted document", async () => {
    const document = await buildDocument({
      title: "🚵🏼‍♂️ Title deleted",
    });
    await document.destroy();
    expect(document.deletedAt).toBeTruthy();
    expect(document.emoji).toBeNull();

    await script();
    const deleted = await Document.unscoped().findByPk(document.id, {
      paranoid: false,
    });
    expect(deleted).not.toBeNull();
    expect(deleted?.title).toEqual("Title deleted");
    expect(deleted?.emoji).toEqual("🚵🏼‍♂️");
  });

  it("should correctly update title emoji when there are leading spaces", async () => {
    const document = await buildDocument({
      title: "    🤨    Title with spaces",
    });
    expect(document.emoji).toBeNull();

    await script();

    const doc = await Document.unscoped().findByPk(document.id);
    expect(doc).not.toBeNull();
    expect(doc?.title).toEqual("Title with spaces");
    expect(doc?.emoji).toEqual("🤨");
  });
});
