import { shouldAutoDeleteDraftOnUnmount } from "./useDocumentSave";

describe("shouldAutoDeleteDraftOnUnmount", () => {
  const baseOptions = {
    title: "",
    createdById: "user-1",
    currentUserId: "user-1",
    isDraft: true,
    isActive: true,
    hasEmptyTitle: true,
    isPersistedOnce: true,
  };

  it("does not auto delete drafts with non-empty editor content", () => {
    expect(
      shouldAutoDeleteDraftOnUnmount({
        ...baseOptions,
        isEditorEmpty: false,
      })
    ).toBe(false);
  });

  it("auto deletes drafts that are still empty and untitled", () => {
    expect(
      shouldAutoDeleteDraftOnUnmount({
        ...baseOptions,
        isEditorEmpty: true,
      })
    ).toBe(true);
  });
});
