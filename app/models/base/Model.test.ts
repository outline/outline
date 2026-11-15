import { autorun, isAction, isObservableProp } from "mobx";
import { vi } from "vitest";
import Collection from "~/models/Collection";
import stores from "~/stores";
import { client } from "~/utils/ApiClient";

const post = vi.mocked(client.post);

describe("Model#save", () => {
  beforeEach(() => {
    post.mockReset();
  });

  describe("updating an existing model", () => {
    it("should optimistically apply changes and keep them on success", async () => {
      const collection = stores.collections.add({
        id: "update-success",
        name: "Before",
      });

      let resolve!: (value: unknown) => void;
      post.mockReturnValueOnce(
        new Promise((res) => {
          resolve = res;
        })
      );

      const promise = collection.save({ name: "After" });

      // the change is visible before the server has responded
      expect(collection.name).toBe("After");
      expect(collection.isSaving).toBe(true);
      expect(collection.isDirty()).toBe(true);

      resolve({
        data: { id: "update-success", name: "After" },
        policies: [],
      });
      await promise;

      expect(collection.name).toBe("After");
      expect(collection.isSaving).toBe(false);
      expect(collection.isDirty()).toBe(false);
    });

    it("should roll back optimistic changes on failure", async () => {
      const collection = stores.collections.add({
        id: "update-failure",
        name: "Before",
      });

      post.mockRejectedValueOnce(new Error("server error"));

      const promise = collection.save({ name: "After" });

      // the change is visible before the server has responded
      expect(collection.name).toBe("After");

      await expect(promise).rejects.toThrow("server error");

      expect(collection.name).toBe("Before");
      expect(collection.isSaving).toBe(false);
      expect(collection.isDirty()).toBe(false);
    });

    it("should not roll back changes made to the model before saving", async () => {
      const collection = stores.collections.add({
        id: "update-premutation",
        name: "Before",
      });
      collection.name = "Edited";

      post.mockRejectedValueOnce(new Error("server error"));

      await expect(collection.save()).rejects.toThrow("server error");

      // changes made directly to the model before calling save are kept so
      // that they are not lost and the save can be retried
      expect(collection.name).toBe("Edited");
      expect(collection.isDirty()).toBe(true);
    });
  });

  describe("creating a new model", () => {
    it("should optimistically add the model to the store and keep it on success", async () => {
      const collection = new Collection({ name: "Draft" }, stores.collections);
      collection.id = "create-success";
      expect(collection.isNew).toBe(true);

      post.mockResolvedValueOnce({
        data: { id: "create-success", name: "Draft" },
        policies: [],
      });

      await collection.save();

      expect(stores.collections.get("create-success")).toBe(collection);
      expect(collection.isNew).toBe(false);
    });

    it("should remove the model from the store on failure", async () => {
      const collection = new Collection({ name: "Draft" }, stores.collections);
      collection.id = "create-failure";
      expect(collection.isNew).toBe(true);

      post.mockRejectedValueOnce(new Error("server error"));

      const promise = collection.save();

      // the model is in the store before the server has responded
      expect(stores.collections.get("create-failure")).toBe(collection);
      expect(collection.isNew).toBe(false);

      await expect(promise).rejects.toThrow("server error");

      expect(stores.collections.get("create-failure")).toBeUndefined();
      expect(collection.isNew).toBe(true);
    });
  });
});

describe("Model observability", () => {
  it("annotates fields declared on the base class and on subclasses", () => {
    const doc = stores.documents.add({
      id: "aaaaaaaa-1111-1111-1111-111111111111",
      title: "hello",
    });

    expect(isObservableProp(doc, "id")).toBe(true); // base Model, in payload
    expect(isObservableProp(doc, "isSaving")).toBe(true); // base Model, has a default
    expect(isObservableProp(doc, "title")).toBe(true); // subclass, in payload
    expect(isObservableProp(doc, "embedsDisabled")).toBe(true); // subclass, has a default
  });

  it("annotates fields omitted from the initial payload", () => {
    // A model created from a partial payload, as a list response returns.
    const doc = stores.documents.add({
      id: "aaaaaaaa-3333-3333-3333-333333333333",
      title: "partial",
    });

    expect(isObservableProp(doc, "fullWidth")).toBe(true);
  });

  it("reacts when a later payload populates an omitted field", () => {
    const doc = stores.documents.add({
      id: "aaaaaaaa-5555-5555-5555-555555555555",
      title: "partial",
    });
    const seen: Array<boolean | undefined> = [];
    const dispose = autorun(() => seen.push(doc.fullWidth));

    // The full payload introduces the field, which must become reactive.
    stores.documents.add({
      id: "aaaaaaaa-5555-5555-5555-555555555555",
      title: "partial",
      fullWidth: false,
    });

    doc.fullWidth = true;
    dispose();
    expect(seen).toEqual([undefined, false, true]);
  });

  it("annotates fields inherited from base classes and omitted from the payload", () => {
    const doc = stores.documents.add({
      id: "aaaaaaaa-6666-6666-6666-666666666666",
      title: "partial",
    });

    expect(isObservableProp(doc, "createdAt")).toBe(true); // Model
    expect(isObservableProp(doc, "deletedAt")).toBe(true); // ParanoidModel
    expect(isObservableProp(doc, "archivedAt")).toBe(true); // ArchivableModel
  });

  it("annotates observable fields that are not serializable fields", () => {
    // Revision content is observable but not a @Field, and list responses
    // omit it entirely.
    const revision = stores.revisions.add({
      id: "bbbbbbbb-1111-1111-1111-111111111111",
      documentId: "aaaaaaaa-1111-1111-1111-111111111111",
      title: "partial",
    });

    expect(isObservableProp(revision, "data")).toBe(true);
  });

  it("tracks reads of an omitted field made before it is populated", () => {
    const revision = stores.revisions.add({
      id: "bbbbbbbb-2222-2222-2222-222222222222",
      documentId: "aaaaaaaa-1111-1111-1111-111111111111",
      title: "partial",
    });
    const seen: Array<string | undefined> = [];
    const dispose = autorun(() => seen.push(revision.data?.type));

    stores.revisions.add({
      id: "bbbbbbbb-2222-2222-2222-222222222222",
      documentId: "aaaaaaaa-1111-1111-1111-111111111111",
      title: "partial",
      data: { type: "doc", content: [] },
    });

    dispose();
    expect(seen).toEqual([undefined, "doc"]);
  });

  it("reacts to changes", () => {
    const doc = stores.documents.add({
      id: "aaaaaaaa-2222-2222-2222-222222222222",
      title: "a",
    });
    const seen: string[] = [];
    const dispose = autorun(() => seen.push(doc.title));
    doc.title = "b";
    dispose();
    expect(seen).toEqual(["a", "b"]);
  });

  it("annotates computed values inherited from the base class", () => {
    const doc = stores.documents.add({
      id: "aaaaaaaa-4444-4444-4444-444444444444",
      title: "c",
    });
    const seen: boolean[] = [];
    const dispose = autorun(() => seen.push(doc.isDeleted));
    doc.deletedAt = "2026-08-18T00:00:00.000Z";
    dispose();
    expect(seen).toEqual([false, true]);
  });

  it("makes store fields observable", () => {
    expect(isObservableProp(stores.documents, "isFetching")).toBe(true);
    expect(isObservableProp(stores.documents, "backlinks")).toBe(true);
    expect(isObservableProp(stores.ui, "theme")).toBe(true);
    expect(isObservableProp(stores.auth, "currentUserId")).toBe(true);
  });

  it("annotates actions declared as store fields", () => {
    expect(isAction(stores.collections.import)).toBe(true);
    expect(isAction(stores.comments.resolve)).toBe(true);
    expect(isAction(stores.groupUsers.removeGroupMemberships)).toBe(true);
    expect(isAction(stores.imports.cancel)).toBe(true);
    expect(isAction(stores.memberships.removeCollectionMemberships)).toBe(true);
    expect(isAction(stores.notifications.markAllAsRead)).toBe(true);
    expect(isAction(stores.templates.duplicate)).toBe(true);
    expect(isAction(Reflect.get(stores.unfurls, "unfurl"))).toBe(true);
    expect(isAction(stores.userMemberships.fetchDocumentMemberships)).toBe(
      true
    );
    expect(isAction(stores.users.invite)).toBe(true);
  });
});
