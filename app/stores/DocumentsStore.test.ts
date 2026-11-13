import stores from "~/stores";

describe("DocumentsStore", () => {
  describe("get", () => {
    it("should return a document by id or by the urlId in a slug", () => {
      const doc = stores.documents.add({
        id: "5f1c2a7e-8a7b-4c3d-9e2f-1a2b3c4d5e6f",
        urlId: "AbCdEf1234",
        title: "Slug",
      });

      expect(stores.documents.get(doc.id)).toBe(doc);
      expect(stores.documents.get("slug-AbCdEf1234")).toBe(doc);
      expect(stores.documents.get("AbCdEf1234")).toBe(doc);
    });

    it("should not match a urlId at the end of an unknown UUID", () => {
      stores.documents.add({
        id: "0b9e7c52-3f0e-4a8f-b1a5-2d7f7d9c1e3a",
        urlId: "e056e0bb98",
        title: "Suffix",
      });

      expect(
        stores.documents.get("9b587fc1-01de-4f4a-aa79-07e056e0bb98")
      ).toBeUndefined();
    });
  });

  describe("deleted", () => {
    it("should filter by the user that deleted the document", () => {
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

  describe("editedByUser", () => {
    it("should return documents the user collaborated on, newest first", () => {
      const userId = "55555555-5555-5555-5555-555555555555";
      const otherId = "66666666-6666-6666-6666-666666666666";

      const older = stores.documents.add({
        id: "77777777-7777-7777-7777-777777777777",
        title: "Older",
        collaboratorIds: [otherId, userId],
        updatedAt: "2026-08-01T00:00:00.000Z",
      });
      const newer = stores.documents.add({
        id: "88888888-8888-8888-8888-888888888888",
        title: "Newer",
        collaboratorIds: [userId],
        updatedAt: "2026-08-02T00:00:00.000Z",
      });
      stores.documents.add({
        id: "99999999-9999-9999-9999-999999999999",
        title: "Not mine",
        collaboratorIds: [otherId],
        updatedAt: "2026-08-03T00:00:00.000Z",
      });
      stores.documents.add({
        id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        title: "No collaborators",
        updatedAt: "2026-08-04T00:00:00.000Z",
      });

      const results = stores.documents.editedByUser(userId);
      expect(results.map((doc) => doc.id)).toEqual([newer.id, older.id]);
    });
  });
});
