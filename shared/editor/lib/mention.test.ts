import { documentMentionAttrs, isSectionMention } from "./mention";

const onboarding = {
  title: "Onboarding",
  heading: "First week",
  anchorId: "h-first-week",
};

describe("documentMentionAttrs", () => {
  it("is the document title alone when the link carries no anchor", () => {
    expect(documentMentionAttrs({ title: "Onboarding" })).toEqual({
      label: "Onboarding",
      anchorId: undefined,
    });
  });

  it("names the document before the heading when it points at another document", () => {
    expect(documentMentionAttrs(onboarding)).toEqual({
      label: "Onboarding \u203a First week",
      anchorId: "h-first-week",
    });
  });

  it("drops the title it would repeat when it points into the document being written", () => {
    expect(documentMentionAttrs({ ...onboarding, sameDocument: true })).toEqual(
      { label: "First week", anchorId: "h-first-week" }
    );
  });

  it("drops an anchor that resolved to no heading, leaving a link to the document", () => {
    expect(
      documentMentionAttrs({ title: "Onboarding", anchorId: "h-fourth-week" })
    ).toEqual({ label: "Onboarding", anchorId: undefined });
  });
});

describe("isSectionMention", () => {
  it("reads a heading referenced from elsewhere in its own document as a section", () => {
    expect(
      isSectionMention(
        documentMentionAttrs({ ...onboarding, sameDocument: true })
      )
    ).toBe(true);
  });

  it("reads a heading referenced from a comment on that document as a section", () => {
    const comment = documentMentionAttrs({ ...onboarding, sameDocument: true });

    expect(isSectionMention(comment)).toBe(true);
  });

  it("reads a heading in another document as a document", () => {
    expect(isSectionMention(documentMentionAttrs(onboarding))).toBe(false);
  });

  it("reads a link whose anchor resolved to no heading as a document", () => {
    expect(
      isSectionMention(
        documentMentionAttrs({ title: "Onboarding", anchorId: "h-fourth-week" })
      )
    ).toBe(false);
  });

  it("reads a document whose own title carries the separator as a document", () => {
    expect(
      isSectionMention(documentMentionAttrs({ title: "Q3 \u203a Q4 planning" }))
    ).toBe(false);
  });
});
