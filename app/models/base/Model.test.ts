/* oxlint-disable */
import { autorun, isAction, isObservableProp } from "mobx";
import stores from "~/stores";

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
