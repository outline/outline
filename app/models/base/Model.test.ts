import { autorun, isAction, isObservableProp } from "mobx";
import { vi } from "vitest";
import { CollectionPermission } from "@shared/types";
import Collection from "~/models/Collection";
import stores from "~/stores";
import { client } from "~/utils/ApiClient";

const post = vi.mocked(client.post);

const defer = () => {
  let resolve!: (value: unknown) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe("Model#save", () => {
  beforeEach(() => {
    post.mockReset();
  });

  it("should apply params before the server responds and keep them on success", async () => {
    const collection = stores.collections.add({
      id: "success",
      name: "Before",
    });
    const request = defer();
    post.mockReturnValueOnce(request.promise);

    const promise = collection.save({ name: "After" });

    expect(collection.name).toBe("After");
    expect(collection.isSaving).toBe(true);
    expect(collection.isDirty()).toBe(true);

    request.resolve({ data: { id: "success", name: "After" }, policies: [] });
    await promise;

    expect(collection.name).toBe("After");
    expect(collection.isSaving).toBe(false);
    expect(collection.isDirty()).toBe(false);
  });

  it("should revert params on failure", async () => {
    const collection = stores.collections.add({
      id: "failure",
      name: "Before",
    });
    post.mockRejectedValueOnce(new Error("server error"));

    const promise = collection.save({ name: "After" });
    expect(collection.name).toBe("After");

    await expect(promise).rejects.toThrow("server error");

    expect(collection.name).toBe("Before");
    expect(collection.isSaving).toBe(false);
    expect(collection.isDirty()).toBe(false);
  });

  it("should not apply params that are not fields", async () => {
    const collection = stores.collections.add({
      id: "non-field",
      name: "Before",
    });
    const request = defer();
    post.mockReturnValueOnce(request.promise);

    const promise = collection.save({ name: "After", publish: true });
    expect("publish" in collection).toBe(false);

    request.reject(new Error("server error"));
    await expect(promise).rejects.toThrow("server error");
  });

  it("should keep unsaved changes when saving without params fails", async () => {
    const collection = stores.collections.add({ id: "direct", name: "Before" });
    collection.name = "Edited";
    const request = defer();
    post.mockReturnValueOnce(request.promise);

    const promise = collection.save();
    collection.name = "Edited again";
    request.reject(new Error("server error"));
    await expect(promise).rejects.toThrow("server error");

    expect(collection.name).toBe("Edited again");
    expect(collection.isDirty()).toBe(true);
  });

  it("should keep changes made to a document while a failed save was in flight", async () => {
    const document = stores.documents.add({ id: "document", title: "Before" });
    document.title = "Edited";
    const request = defer();
    post.mockReturnValueOnce(request.promise);

    const promise = document.save();
    document.title = "Edited again";
    request.reject(new Error("server error"));
    await expect(promise).rejects.toThrow("server error");

    expect(document.title).toBe("Edited again");
  });

  it("should revert document fields on failure", async () => {
    const document = stores.documents.add({
      id: "document-fields",
      title: "Before",
    });
    post.mockRejectedValueOnce(new Error("server error"));

    const promise = document.save({ title: "After" });
    expect(document.title).toBe("After");

    await expect(promise).rejects.toThrow("server error");
    expect(document.title).toBe("Before");
  });

  it("should keep a newer successful save when an older one fails", async () => {
    const collection = stores.collections.add({ id: "stale", name: "Before" });
    const first = defer();
    const second = defer();
    post.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

    const firstSave = collection.save({ name: "One" });
    const secondSave = collection.save({ name: "Two" });

    second.resolve({ data: { id: "stale", name: "Two" }, policies: [] });
    await secondSave;
    first.reject(new Error("server error"));
    await expect(firstSave).rejects.toThrow("server error");

    expect(collection.name).toBe("Two");
    expect(collection.isDirty()).toBe(false);
  });

  it("should revert to the confirmed value when overlapping saves all fail", async () => {
    const collection = stores.collections.add({
      id: "overlap",
      name: "Before",
    });
    const first = defer();
    const second = defer();
    post.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

    const firstSave = collection.save({ name: "One" });
    const secondSave = collection.save({ name: "Two" });

    first.reject(new Error("server error"));
    await expect(firstSave).rejects.toThrow("server error");
    expect(collection.name).toBe("Two");

    second.reject(new Error("server error"));
    await expect(secondSave).rejects.toThrow("server error");
    expect(collection.name).toBe("Before");
    expect(collection.isDirty()).toBe(false);
  });

  it("should keep an update received while a failed save was in flight", async () => {
    const collection = stores.collections.add({ id: "remote", name: "Before" });
    const request = defer();
    post.mockReturnValueOnce(request.promise);

    const promise = collection.save({ name: "Mine" });
    stores.collections.add({ id: "remote", name: "Theirs" });
    request.reject(new Error("server error"));
    await expect(promise).rejects.toThrow("server error");

    expect(collection.name).toBe("Theirs");
    expect(collection.isDirty()).toBe(false);
  });

  it("should stay clean when an unrelated update arrives before a failure", async () => {
    const collection = stores.collections.add({
      id: "unrelated",
      name: "Before",
      icon: "one",
    });
    const request = defer();
    post.mockReturnValueOnce(request.promise);

    const promise = collection.save({ name: "Mine" });
    stores.collections.add({ id: "unrelated", icon: "two" });
    request.reject(new Error("server error"));
    await expect(promise).rejects.toThrow("server error");

    expect(collection.name).toBe("Before");
    expect(collection.icon).toBe("two");
    expect(collection.isDirty()).toBe(false);
  });

  it("should run change hooks when the server confirms, not before", async () => {
    const collection = stores.collections.add({
      id: "hooks",
      name: "Hooks",
      permission: undefined,
    });
    stores.documents.add({
      id: "hooks-doc",
      title: "t",
      collectionId: "hooks",
    });
    stores.policies.add({ id: "hooks-doc", abilities: {} });
    const request = defer();
    post.mockReturnValueOnce(request.promise);

    const promise = collection.save({ permission: CollectionPermission.Read });
    expect(stores.policies.get("hooks-doc")).toBeDefined();

    request.resolve({
      data: { id: "hooks", name: "Hooks", permission: "read" },
      policies: [],
    });
    await promise;

    expect(stores.policies.get("hooks-doc")).toBeUndefined();
  });

  it("should not run change hooks for an unrelated update during a save", async () => {
    const collection = stores.collections.add({
      id: "hooks-unrelated",
      name: "Hooks",
      icon: "one",
      permission: undefined,
    });
    stores.documents.add({
      id: "hooks-unrelated-doc",
      title: "t",
      collectionId: "hooks-unrelated",
    });
    stores.policies.add({ id: "hooks-unrelated-doc", abilities: {} });
    const request = defer();
    post.mockReturnValueOnce(request.promise);

    const promise = collection.save({ permission: CollectionPermission.Read });
    stores.collections.add({ id: "hooks-unrelated", icon: "two" });
    expect(stores.policies.get("hooks-unrelated-doc")).toBeDefined();

    request.reject(new Error("server error"));
    await expect(promise).rejects.toThrow("server error");

    expect(collection.permission).toBeUndefined();
    expect(stores.policies.get("hooks-unrelated-doc")).toBeDefined();
  });

  it("should not run change hooks when the save fails", async () => {
    const collection = stores.collections.add({
      id: "hooks-failure",
      name: "Hooks",
      permission: undefined,
    });
    stores.documents.add({
      id: "hooks-failure-doc",
      title: "t",
      collectionId: "hooks-failure",
    });
    stores.policies.add({ id: "hooks-failure-doc", abilities: {} });
    post.mockRejectedValueOnce(new Error("server error"));

    await expect(
      collection.save({ permission: CollectionPermission.Read })
    ).rejects.toThrow("server error");

    expect(collection.permission).toBeUndefined();
    expect(stores.policies.get("hooks-failure-doc")).toBeDefined();
  });

  it("should leave a new model new and out of the store on failure", async () => {
    const collection = new Collection({ name: "Draft" }, stores.collections);
    expect(collection.isNew).toBe(true);
    post.mockRejectedValueOnce(new Error("server error"));

    const promise = collection.save({ name: "Named" });
    expect(collection.name).toBe("Named");
    await expect(promise).rejects.toThrow("server error");

    expect(collection.name).toBe("Draft");
    expect(collection.isNew).toBe(true);
    expect(
      Array.from(stores.collections.data.values()).includes(collection)
    ).toBe(false);
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
