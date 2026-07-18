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
    test("should optimistically apply changes and keep them on success", async () => {
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

    test("should roll back optimistic changes on failure", async () => {
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

    test("should not roll back changes made to the model before saving", async () => {
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
    test("should optimistically add the model to the store and keep it on success", async () => {
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

    test("should remove the model from the store on failure", async () => {
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
