import { createContext } from "@server/context";
import { buildDocument, buildUser } from "@server/test/factories";
import Revision from "./Revision";

describe("#findLatest", () => {
  it("should return latest revision", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      title: "Title",
      text: "Content",
      userId: user.id,
    });
    const ctx = createContext({ user });
    await Revision.createFromDocument(ctx, document);
    document.title = "Changed 1";
    await document.save();
    await Revision.createFromDocument(ctx, document);
    document.title = "Changed 2";
    await document.save();
    await Revision.createFromDocument(ctx, document);
    const revision = await Revision.findLatest(document.id);
    expect(revision?.title).toBe("Changed 2");
  });
});

describe("#findByIdForDocument", () => {
  it("should return the revision when it belongs to the document", async () => {
    const user = await buildUser();
    const document = await buildDocument({ userId: user.id });
    const revision = await Revision.createFromDocument(
      createContext({ user }),
      document
    );

    const found = await Revision.findByIdForDocument(revision.id, document.id);
    expect(found?.id).toBe(revision.id);
  });

  it("should return null for a revision of another document", async () => {
    const user = await buildUser();
    const document = await buildDocument({ userId: user.id });
    const other = await buildDocument({ userId: user.id });
    const revision = await Revision.createFromDocument(
      createContext({ user }),
      other
    );

    expect(
      await Revision.findByIdForDocument(revision.id, document.id)
    ).toBeNull();
  });

  it("should return null for an id that is not a uuid", async () => {
    const document = await buildDocument();

    expect(
      await Revision.findByIdForDocument("not-a-uuid", document.id)
    ).toBeNull();
  });
});

describe("#findLatestByUser", () => {
  it("should return the latest revision the user authored or collaborated on", async () => {
    const user = await buildUser();
    const other = await buildUser({ teamId: user.teamId });
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });
    await Revision.createFromDocument(createContext({ user }), document);
    document.title = "Shared";
    document.lastModifiedById = other.id;
    await document.save();
    const shared = await Revision.createFromDocument(
      createContext({ user: other }),
      document,
      [other.id, user.id]
    );
    document.title = "Theirs";
    await document.save();
    await Revision.createFromDocument(createContext({ user: other }), document);

    const found = await Revision.findLatestByUser(document.id, user.id);
    expect(found?.id).toBe(shared.id);
  });

  it("should return null when the user has no revisions", async () => {
    const user = await buildUser();
    const other = await buildUser({ teamId: user.teamId });
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });
    await Revision.createFromDocument(createContext({ user }), document);

    expect(await Revision.findLatestByUser(document.id, other.id)).toBeNull();
  });
});

describe("#findAt", () => {
  it("should return the latest revision at or before the date", async () => {
    const document = await buildDocument();
    const first = Revision.buildFromDocument(document);
    first.createdAt = new Date("2026-01-01T00:00:00Z");
    await first.save();
    const second = Revision.buildFromDocument(document);
    second.createdAt = new Date("2026-02-01T00:00:00Z");
    await second.save();

    const found = await Revision.findAt(
      document.id,
      new Date("2026-01-15T00:00:00Z")
    );
    expect(found?.id).toBe(first.id);
    expect(
      (await Revision.findAt(document.id, new Date("2026-02-01T00:00:00Z")))?.id
    ).toBe(second.id);
  });

  it("should return null before the first revision", async () => {
    const document = await buildDocument();
    const revision = Revision.buildFromDocument(document);
    revision.createdAt = new Date("2026-01-01T00:00:00Z");
    await revision.save();

    expect(
      await Revision.findAt(document.id, new Date("2025-01-01T00:00:00Z"))
    ).toBeNull();
  });
});
