/* oxlint-disable */
import stores from "~/stores";
import { client } from "~/utils/ApiClient";
import { petsoClient } from "~/utils/petsoClient";
describe("Notebook model", () => {
  test("should initialize with data", () => {
    const notebook = stores.notebooks.add({
      id: "123",
      name: "Engineering",
    });
    expect(notebook.name).toBe("Engineering");
  });
  test("maps collection identifiers at the API boundary", () => {
    const wireNote = {
      id: "note-wire-123",
      title: "Wire boundary",
      collectionId: "123",
    };
    const note = stores.notes.add(wireNote);
    expect(note.notebookId).toBe("123");
    expect(note.toAPI()).toMatchObject({ collectionId: "123" });
  });
  test("normalizes singular and plural legacy paths", () => {
    const singular = stores.notebooks.add({
      id: "legacy-singular",
      name: "Legacy singular",
      url: "/collection/legacy-singular",
    });
    const plural = stores.notebooks.add({
      id: "legacy-plural",
      name: "Legacy plural",
      url: "/collections/legacy-plural",
    });
    expect(singular.path).toBe("/notebook/legacy-singular");
    expect(plural.path).toBe("/notebook/legacy-plural");
  });
  test("serializes aliased fields for explicit save parameters", async () => {
    const template = stores.templates.add({
      id: "template-wire-123",
      title: "Wire template",
    });
    const save = vi.spyOn(template.store, "save").mockResolvedValue(template);

    await template.save({ notebookId: null });

    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ collectionId: null }),
      expect.objectContaining({ isNew: false })
    );
    expect(save.mock.calls[0][0]).not.toHaveProperty("notebookId");
    save.mockRestore();
  });
  test("serializes aliased fields for store creates", async () => {
    const createNote = vi
      .spyOn(petsoClient.admin, "createNote")
      .mockResolvedValue({
        id: "note-store-wire",
        businessId: "business-1",
        collectionId: "123",
        parentNoteId: null,
        createdBy: "user-1",
        title: "Store wire",
        content: {},
        icon: null,
        color: null,
        isPublished: false,
        publishedAt: null,
        isArchived: false,
        archivedAt: null,
        deletedAt: null,
        revision: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

    await stores.notes.create({
      title: "Store wire",
      notebookId: "123",
    });

    expect(createNote).toHaveBeenCalledWith(
      expect.objectContaining({ collectionId: "123" })
    );
    expect(createNote.mock.calls[0]?.[0]).not.toHaveProperty("notebookId");
    createNote.mockRestore();
  });
  test("serializes aliased fields for pin list requests", async () => {
    const post = vi.spyOn(client, "post").mockResolvedValue({
      data: {
        documents: [],
        pins: [],
      },
      policies: [],
    });

    await stores.pins.fetchPage({ notebookId: "123" });

    expect(post).toHaveBeenCalledWith(
      "/pins.list",
      expect.objectContaining({ collectionId: "123" })
    );
    const pinCall = post.mock.calls.find(([path]) => path === "/pins.list");
    expect(pinCall?.[1]).not.toHaveProperty("notebookId");
    post.mockRestore();
  });
  test("serializes aliased fields for store list requests", async () => {
    const post = vi.spyOn(client, "post").mockResolvedValue({
      data: [],
      policies: [],
    });

    await stores.notes.fetchPage({ notebookId: "123" });

    expect(post).toHaveBeenCalledWith(
      `/${stores.notes.apiEndpoint}.list`,
      expect.objectContaining({ collectionId: "123" })
    );
    const listCall = post.mock.calls.find(
      ([path]) => path === `/${stores.notes.apiEndpoint}.list`
    );
    expect(listCall?.[1]).not.toHaveProperty("notebookId");
    post.mockRestore();
  });
});
