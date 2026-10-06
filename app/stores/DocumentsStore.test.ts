/* oxlint-disable */
import type Tag from "~/models/Tag";
import stores from "~/stores";

describe("DocumentsStore", () => {
  describe("deleted", () => {
    test("should filter by the user that deleted the document", () => {
      const deleter = stores.users.add({
        id: "22222222-2222-2222-2222-222222222222",
        name: "Deleter",
      });
      const other = stores.users.add({
        id: "33333333-3333-3333-3333-333333333333",
        name: "Other",
      });

      const mine = stores.documents.add({
        id: "11111111-1111-1111-1111-111111111111",
        title: "Deleted by me",
        deletedAt: "2026-08-18T00:00:00.000Z",
        deletedBy: deleter,
      });
      stores.documents.add({
        id: "44444444-4444-4444-4444-444444444444",
        title: "Deleted by someone else",
        deletedAt: "2026-08-18T00:00:00.000Z",
        deletedBy: other,
      });

      const results = stores.documents.deleted({ userId: deleter.id });
      expect(results.map((doc) => doc.id)).toEqual([mine.id]);
    });
  });

  describe("tags", () => {
    test("should hydrate tags into the tags store on add and update", () => {
      const document = stores.documents.add({
        id: "55555555-5555-5555-5555-555555555555",
        title: "Tagged",
        tags: [
          { id: "66666666-6666-6666-6666-666666666666", name: "alpha" },
        ] as unknown as Tag[],
      });
      expect(document.tags?.map((tag) => tag.name)).toEqual(["alpha"]);
      expect(stores.tags.getByName("alpha")).toBe(document.tags?.[0]);

      stores.documents.add({
        id: document.id,
        tags: [
          { id: "77777777-7777-7777-7777-777777777777", name: "beta" },
        ] as unknown as Tag[],
      });
      expect(document.tags?.map((tag) => tag.name)).toEqual(["beta"]);
    });
  });
});
