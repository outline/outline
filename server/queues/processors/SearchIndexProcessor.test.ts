import { SearchableModel } from "@shared/types";
import {
  buildDocument,
  buildCollection,
  buildUser,
} from "@server/test/factories";
import SearchProviderManager from "@server/utils/SearchProviderManager";
import SearchIndexProcessor from "./SearchIndexProcessor";

type PerformArg = Parameters<SearchIndexProcessor["perform"]>[0];

const processor = new SearchIndexProcessor();

describe("SearchIndexProcessor", () => {
  it("should have the expected applicable events", () => {
    expect(SearchIndexProcessor.applicableEvents).toContain(
      "documents.publish"
    );
    expect(SearchIndexProcessor.applicableEvents).toContain(
      "documents.update.delayed"
    );
    expect(SearchIndexProcessor.applicableEvents).toContain(
      "documents.permanent_delete"
    );
    expect(SearchIndexProcessor.applicableEvents).toContain(
      "collections.create"
    );
    expect(SearchIndexProcessor.applicableEvents).toContain("comments.create");
    expect(SearchIndexProcessor.applicableEvents).toContain("comments.delete");
  });

  it("should call provider.index for documents.publish", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      teamId: user.teamId,
      userId: user.id,
    });
    const document = await buildDocument({
      teamId: user.teamId,
      collectionId: collection.id,
      userId: user.id,
    });

    const provider = SearchProviderManager.getProvider();
    const indexSpy = jest.spyOn(provider, "index");

    await processor.perform({
      name: "documents.publish",
      documentId: document.id,
      collectionId: collection.id,
      teamId: user.teamId,
      actorId: user.id,
    } as PerformArg);

    expect(indexSpy).toHaveBeenCalledWith(
      SearchableModel.Document,
      expect.objectContaining({ id: document.id })
    );

    indexSpy.mockRestore();
  });

  it("should call provider.remove for documents.permanent_delete", async () => {
    const user = await buildUser();
    const provider = SearchProviderManager.getProvider();
    const removeSpy = jest.spyOn(provider, "remove");

    await processor.perform({
      name: "documents.permanent_delete",
      documentId: "deleted-doc-id",
      collectionId: "some-collection-id",
      teamId: user.teamId,
      actorId: user.id,
    } as PerformArg);

    expect(removeSpy).toHaveBeenCalledWith(
      SearchableModel.Document,
      "deleted-doc-id",
      user.teamId
    );

    removeSpy.mockRestore();
  });
});
