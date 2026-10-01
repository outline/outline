import type Tag from "~/models/Tag";
import stores from "~/stores";
import { client } from "~/utils/ApiClient";

const post = vi.mocked(client.post);

describe("TagsStore", () => {
  beforeEach(() => {
    stores.tags.clear();
  });

  it("populates name cache when a tag is added", () => {
    stores.tags.add({
      id: "1",
      name: "engineering",
      teamId: "t1",
    } as unknown as Tag);
    expect(stores.tags.getByName("engineering")).toBeDefined();
  });

  it("getByName is case-insensitive", () => {
    stores.tags.add({
      id: "1",
      name: "engineering",
      teamId: "t1",
    } as unknown as Tag);
    expect(stores.tags.getByName("ENGINEERING")).toBeDefined();
    expect(stores.tags.getByName("Engineering")).toBeDefined();
  });

  it("getByName returns undefined for missing tags", () => {
    expect(stores.tags.getByName("nonexistent")).toBeUndefined();
  });

  it("orderedData is sorted alphabetically", () => {
    stores.tags.add({ id: "2", name: "zebra", teamId: "t1" } as unknown as Tag);
    stores.tags.add({ id: "1", name: "alpha", teamId: "t1" } as unknown as Tag);
    const names = stores.tags.orderedData.map((t) => t.name);
    expect(names).toEqual(["alpha", "zebra"]);
  });

  it("clear() empties both orderedData and the name cache", () => {
    stores.tags.add({
      id: "1",
      name: "engineering",
      teamId: "t1",
    } as unknown as Tag);
    stores.tags.clear();
    expect(stores.tags.orderedData).toHaveLength(0);
    expect(stores.tags.getByName("engineering")).toBeUndefined();
  });

  it("keeps a known document count when a payload omits it", () => {
    stores.tags.add({
      id: "1",
      name: "engineering",
      teamId: "t1",
      documentCount: 4,
    } as unknown as Tag);
    // embedded document tags are slim: { id, name, color }
    stores.tags.add({ id: "1", name: "engineering", color: null });
    expect(stores.tags.get("1")?.documentCount).toBe(4);
  });

  it("adding the same tag twice updates in place and does not duplicate in name cache", () => {
    stores.tags.add({
      id: "1",
      name: "engineering",
      teamId: "t1",
    } as unknown as Tag);
    stores.tags.add({
      id: "1",
      name: "engineering",
      teamId: "t1",
    } as unknown as Tag);
    expect(stores.tags.orderedData).toHaveLength(1);
    expect(stores.tags.getByName("engineering")).toBeDefined();
  });

  describe("realtime document updates", () => {
    const documentId = "88888888-8888-8888-8888-888888888888";
    const otherDocumentId = "99999999-9999-9999-9999-999999999999";
    const alpha = { id: "a1", name: "alpha", teamId: "t1" };
    const beta = { id: "b1", name: "beta", teamId: "t1" };

    beforeEach(() => {
      stores.documents.clear();
    });

    it("attachToDocument adds the tag to a loaded document once", () => {
      const document = stores.documents.add({
        id: documentId,
        title: "Loaded",
        tags: [alpha] as unknown as Tag[],
      });

      stores.tags.attachToDocument(documentId, beta);
      stores.tags.attachToDocument(documentId, beta);

      expect(document.tagIds).toEqual(["a1", "b1"]);
      expect(stores.tags.get("b1")?.name).toEqual("beta");
    });

    it("attachToDocument leaves documents without loaded tags untouched", () => {
      const document = stores.documents.add({
        id: documentId,
        title: "Unloaded",
      });

      stores.tags.attachToDocument(documentId, beta);

      expect(document.tagIds).toBeUndefined();
      expect(stores.tags.get("b1")).toBeUndefined();
    });

    it("attachToDocument updates a known tag for an unloaded document", () => {
      stores.tags.add(alpha as unknown as Tag);

      stores.tags.attachToDocument(documentId, { ...alpha, name: "renamed" });

      expect(stores.tags.get("a1")?.name).toEqual("renamed");
    });

    it("detachFromDocument removes the tag from the document only", () => {
      const document = stores.documents.add({
        id: documentId,
        title: "Loaded",
        tags: [alpha, beta] as unknown as Tag[],
      });

      stores.tags.detachFromDocument(documentId, "a1");

      expect(document.tagIds).toEqual(["b1"]);
      expect(stores.tags.get("a1")).toBeDefined();
    });

    it("remove drops the tag from every loaded document", () => {
      const first = stores.documents.add({
        id: documentId,
        title: "First",
        tags: [alpha, beta] as unknown as Tag[],
      });
      const second = stores.documents.add({
        id: otherDocumentId,
        title: "Second",
        tags: [alpha] as unknown as Tag[],
      });

      stores.tags.remove("a1");

      expect(stores.tags.get("a1")).toBeUndefined();
      expect(first.tagIds).toEqual(["b1"]);
      expect(second.tagIds).toEqual([]);
    });

    describe("applyMerge", () => {
      const gamma = { id: "g1", name: "gamma", teamId: "t1" };

      it("repoints loaded documents from the source to the target tag", () => {
        const document = stores.documents.add({
          id: documentId,
          title: "Loaded",
          tags: [alpha, beta] as unknown as Tag[],
        });

        stores.tags.applyMerge(gamma as unknown as Tag, "a1");

        expect(document.tagIds).toEqual(["b1", "g1"]);
      });

      it("does not duplicate when the document already has the target", () => {
        const document = stores.documents.add({
          id: documentId,
          title: "Loaded",
          tags: [alpha, beta] as unknown as Tag[],
        });

        stores.tags.applyMerge(beta as unknown as Tag, "a1");

        expect(document.tagIds).toEqual(["b1"]);
      });

      it("removes the source tag from the store", () => {
        stores.documents.add({
          id: documentId,
          title: "Loaded",
          tags: [alpha, beta] as unknown as Tag[],
        });

        stores.tags.applyMerge(gamma as unknown as Tag, "a1");

        expect(stores.tags.get("a1")).toBeUndefined();
      });

      it("stores the target tag even when it was not loaded before", () => {
        const document = stores.documents.add({
          id: documentId,
          title: "Loaded",
          tags: [alpha] as unknown as Tag[],
        });

        stores.tags.applyMerge(gamma as unknown as Tag, "a1");

        expect(stores.tags.get("g1")?.name).toEqual("gamma");
        expect(document.tagIds).toEqual(["g1"]);
      });

      it("leaves documents without the source tag untouched", () => {
        const document = stores.documents.add({
          id: otherDocumentId,
          title: "Unrelated",
          tags: [beta] as unknown as Tag[],
        });

        stores.tags.applyMerge(gamma as unknown as Tag, "a1");

        expect(document.tagIds).toEqual(["b1"]);
      });
    });
  });

  describe("API actions", () => {
    const documentId = "77777777-7777-7777-7777-777777777777";
    const otherDocumentId = "66666666-6666-6666-6666-666666666666";
    const alpha = { id: "a1", name: "alpha", teamId: "t1" };
    const beta = { id: "b1", name: "beta", teamId: "t1" };

    beforeEach(() => {
      stores.documents.clear();
      post.mockReset();
    });

    it("fetchAll requests every page and stores all tags", async () => {
      post.mockImplementation((_path, params) => {
        const offset = (params as { offset?: number })?.offset ?? 0;
        return Promise.resolve({
          data: offset === 0 ? [alpha] : [beta],
          pagination: { total: 2, limit: 1, offset, nextPath: "" },
          policies: [],
        });
      });

      const result = await stores.tags.fetchAll({ limit: 1 });

      expect(post).toHaveBeenCalledTimes(2);
      expect(post).toHaveBeenCalledWith("/tags.list", { limit: 1 });
      expect(post).toHaveBeenCalledWith("/tags.list", { limit: 1, offset: 1 });
      expect(result.map((tag) => tag.id)).toEqual(["a1", "b1"]);
      expect(stores.tags.orderedData.map((tag) => tag.name)).toEqual([
        "alpha",
        "beta",
      ]);
      expect(stores.tags.isLoaded).toBe(true);
    });

    it("fetchAll loads every tag when there are more than two pages", async () => {
      // Mirrors the tags.list response: the total is the exact count of
      // visible tags, not estimated from the page size.
      const all = Array.from({ length: 60 }, (_, i) => ({
        id: `t${i}`,
        name: `tag-${String(i).padStart(2, "0")}`,
        teamId: "t1",
      }));
      post.mockImplementation((_path, params) => {
        const { offset = 0, limit = 25 } =
          (params as { offset?: number; limit?: number }) ?? {};
        return Promise.resolve({
          data: all.slice(offset, offset + limit),
          pagination: { total: all.length, limit, offset, nextPath: "" },
          policies: [],
        });
      });

      const result = await stores.tags.fetchAll();

      expect(post).toHaveBeenCalledTimes(3);
      expect(result).toHaveLength(60);
      expect(stores.tags.orderedData).toHaveLength(60);
    });

    it("fetchAllIfNeeded does not refetch a loaded list", async () => {
      post.mockResolvedValue({
        data: [alpha],
        pagination: { total: 1, limit: 25, offset: 0, nextPath: "" },
        policies: [],
      });

      await stores.tags.fetchAllIfNeeded();
      await stores.tags.fetchAllIfNeeded();

      expect(post).toHaveBeenCalledTimes(1);
    });

    it("update renames the tag everywhere it is shown", async () => {
      const document = stores.documents.add({
        id: documentId,
        title: "Loaded",
        tags: [alpha] as unknown as Tag[],
      });
      post.mockResolvedValue({
        data: { ...alpha, name: "renamed", color: null },
        policies: [],
      });

      await stores.tags.update({ id: "a1", name: "renamed", color: null });

      expect(post).toHaveBeenCalledWith("/tags.update", {
        id: "a1",
        name: "renamed",
        color: null,
      });
      expect(stores.tags.get("a1")?.name).toEqual("renamed");
      expect(stores.tags.getByName("renamed")?.id).toEqual("a1");
      expect(stores.tags.getByName("alpha")).toBeUndefined();
      expect(document.tags?.map((tag) => tag.name)).toEqual(["renamed"]);
    });

    it("delete removes the tag from the store and loaded documents", async () => {
      const document = stores.documents.add({
        id: documentId,
        title: "Loaded",
        tags: [alpha, beta] as unknown as Tag[],
      });
      post.mockResolvedValue({ success: true });

      await stores.tags.delete(stores.tags.get("a1")!);

      expect(post).toHaveBeenCalledWith("/tags.delete", { id: "a1" });
      expect(stores.tags.get("a1")).toBeUndefined();
      expect(document.tagIds).toEqual(["b1"]);
    });

    it("merge repoints loaded documents and stores the returned target", async () => {
      const first = stores.documents.add({
        id: documentId,
        title: "First",
        tags: [alpha] as unknown as Tag[],
      });
      const second = stores.documents.add({
        id: otherDocumentId,
        title: "Second",
        tags: [alpha, beta] as unknown as Tag[],
      });
      post.mockResolvedValue({
        data: { ...beta, documentCount: 2 },
        policies: [],
      });

      const target = await stores.tags.merge("a1", "b1");

      expect(post).toHaveBeenCalledWith("/tags.merge", {
        sourceId: "a1",
        targetId: "b1",
      });
      expect(target.id).toEqual("b1");
      expect(target.documentCount).toEqual(2);
      expect(stores.tags.get("a1")).toBeUndefined();
      expect(first.tagIds).toEqual(["b1"]);
      expect(second.tagIds).toEqual(["b1"]);
    });

    it("merge leaves the store untouched when the request fails", async () => {
      const document = stores.documents.add({
        id: documentId,
        title: "Loaded",
        tags: [alpha] as unknown as Tag[],
      });
      stores.tags.add(beta as unknown as Tag);
      post.mockRejectedValue(new Error("Forbidden"));

      await expect(stores.tags.merge("a1", "b1")).rejects.toThrow("Forbidden");

      expect(stores.tags.get("a1")).toBeDefined();
      expect(document.tagIds).toEqual(["a1"]);
    });

    it("addToDocument records the tag on the loaded document", async () => {
      const document = stores.documents.add({
        id: documentId,
        title: "Loaded",
        tags: [alpha] as unknown as Tag[],
      });
      stores.tags.add(beta as unknown as Tag);
      post.mockResolvedValue({ success: true });

      await stores.tags.addToDocument("b1", documentId);

      expect(post).toHaveBeenCalledWith("/tags.add", {
        tagId: "b1",
        documentId,
      });
      expect(document.tagIds).toEqual(["a1", "b1"]);
    });

    it("addToDocument leaves the document unchanged when the request fails", async () => {
      const document = stores.documents.add({
        id: documentId,
        title: "Loaded",
        tags: [alpha] as unknown as Tag[],
      });
      stores.tags.add(beta as unknown as Tag);
      post.mockRejectedValue(new Error("Forbidden"));

      await expect(stores.tags.addToDocument("b1", documentId)).rejects.toThrow(
        "Forbidden"
      );

      expect(document.tagIds).toEqual(["a1"]);
    });

    it("removeFromDocument removes the tag before the request resolves", async () => {
      const document = stores.documents.add({
        id: documentId,
        title: "Loaded",
        tags: [alpha, beta] as unknown as Tag[],
      });
      let resolve: (value: unknown) => void = () => undefined;
      post.mockReturnValue(
        new Promise((r) => {
          resolve = r;
        })
      );

      const promise = stores.tags.removeFromDocument("a1", documentId);

      expect(document.tagIds).toEqual(["b1"]);
      resolve({ success: true });
      await promise;
      expect(post).toHaveBeenCalledWith("/tags.remove", {
        tagId: "a1",
        documentId,
      });
      expect(document.tagIds).toEqual(["b1"]);
    });

    it("removeFromDocument restores the tag in place when the request fails", async () => {
      const document = stores.documents.add({
        id: documentId,
        title: "Loaded",
        tags: [alpha, beta] as unknown as Tag[],
      });
      post.mockRejectedValue(new Error("Forbidden"));

      await expect(
        stores.tags.removeFromDocument("a1", documentId)
      ).rejects.toThrow("Forbidden");

      expect(document.tagIds).toEqual(["a1", "b1"]);
    });
  });
});
