import type { Slice } from "prosemirror-model";
import { ChangesetHelper, type ExtendedChange } from "./ChangesetHelper";
import type { ProsemirrorData } from "../../types";

/**
 * Builds a single-paragraph document from the given text.
 */
function para(text: string): ProsemirrorData {
  return {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  };
}

/**
 * Builds a document with one paragraph per provided text.
 */
function paras(...texts: string[]): ProsemirrorData {
  return {
    type: "doc",
    content: texts.map((text) => ({
      type: "paragraph",
      content: [{ type: "text", text }],
    })),
  };
}

/**
 * Computes the changeset between two documents, asserts it is non-null, and
 * returns the resulting changes.
 */
function changesFor(
  after: ProsemirrorData,
  before: ProsemirrorData
): readonly ExtendedChange[] {
  const result = ChangesetHelper.getChangeset(after, before);
  expect(result).not.toBeNull();
  return result!.changes;
}

/**
 * Concatenates the text content of every deletion slice in a change.
 */
function deletedText(change: ExtendedChange): string {
  return change.deleted
    .map((deletion) => {
      const { slice } = deletion.data as { slice: Slice | null };
      return slice ? slice.content.textBetween(0, slice.content.size) : "";
    })
    .join("");
}

describe("ChangesetHelper.getChangeset", () => {
  it("returns null when there is no previous revision to compare against", () => {
    expect(ChangesetHelper.getChangeset(para("Hello"), null)).toBeNull();
    expect(ChangesetHelper.getChangeset(null, para("Hello"))).toBeNull();
  });

  describe("interleaved word-diff merging", () => {
    it("merges a hyphenated word replacement into a single change", () => {
      // Word-level diffing splits "no-await-in-loop" -> "jsx-no-jsx-as-prop"
      // into several interleaved delete/insert changes around the hyphens.
      // These should be merged back into one change covering the whole word.
      const changes = changesFor(
        para("jsx-no-jsx-as-prop"),
        para("no-await-in-loop")
      );

      expect(changes).toHaveLength(1);

      const [change] = changes;
      expect(change.fromA).toBe(1);
      expect(change.toA).toBe(17); // length of "no-await-in-loop" + 1 (doc offset)
      expect(change.fromB).toBe(1);
      expect(change.toB).toBe(19); // length of "jsx-no-jsx-as-prop" + 1
      expect(change.deleted).toHaveLength(1);
      expect(change.inserted).toHaveLength(1);
    });

    it("captures the full original word in the merged deletion", () => {
      const changes = changesFor(
        para("jsx-no-jsx-as-prop"),
        para("no-await-in-loop")
      );

      expect(deletedText(changes[0])).toBe("no-await-in-loop");
    });
  });

  describe("does not over-merge unrelated changes", () => {
    it("keeps edits in separate nodes separate", () => {
      // Two single-character replacements in two different paragraphs sit
      // close together positionally, but the gap between them crosses a
      // paragraph boundary and must not be merged.
      const changes = changesFor(paras("c", "d"), paras("a", "b"));

      expect(changes).toHaveLength(2);
      expect(deletedText(changes[0])).toBe("a");
      expect(deletedText(changes[1])).toBe("b");
    });

    it("keeps edits separated by a large unchanged gap separate", () => {
      // "quick" and "fox" are replaced, but the unchanged " brown " between
      // them exceeds the merge gap threshold, so they stay distinct.
      const changes = changesFor(
        para("The slow brown lazy"),
        para("The quick brown fox")
      );

      expect(changes).toHaveLength(2);
      expect(deletedText(changes[0])).toBe("quick");
      expect(deletedText(changes[1])).toBe("fox");
    });

    it("does not merge a cluster of pure insertions", () => {
      // Inserting text on both sides of the unchanged "a" produces two pure
      // insertions a short gap apart. Merging them would render the unchanged
      // "a" as inserted, so the window (no deletion) must not merge.
      const changes = changesFor(para("foo a bar"), para("a"));

      expect(changes).toHaveLength(2);
      // Both are pure insertions — nothing is marked as deleted.
      expect(changes.every((change) => change.deleted.length === 0)).toBe(true);
    });

    it("does not merge a cluster of pure deletions", () => {
      // Deleting text on both sides of the unchanged "a" produces two pure
      // deletions a short gap apart. Merging them would render the unchanged
      // "a" as deleted, so the window (no insertion) must not merge.
      const changes = changesFor(para("a"), para("foo a bar"));

      expect(changes).toHaveLength(2);
      // The unchanged "a" is not absorbed into either deletion.
      expect(deletedText(changes[0])).toBe("foo ");
      expect(deletedText(changes[1])).toBe(" bar");
    });
  });

  describe("gap merge threshold", () => {
    // Two word replacements ("cat"->"fox", "dog"->"pig") separated by an
    // unchanged middle word. The gap between the two changes equals the
    // middle length plus its two surrounding spaces. mergeInterleavedChanges
    // merges them only while that gap is <= MAX_UNCHANGED_GAP (3).
    //
    // The trade-off these cases document: when the gap is small enough to
    // merge, the unchanged middle word is absorbed into the deletion and
    // therefore rendered as deleted + reinserted.

    it("merges across a gap of 3, absorbing the unchanged middle", () => {
      // " a " => gap of 3 (1 char + 2 spaces), the threshold.
      const changes = changesFor(para("fox a pig"), para("cat a dog"));

      expect(changes).toHaveLength(1);
      // The unchanged "a" is swallowed into the merged deletion.
      expect(deletedText(changes[0])).toBe("cat a dog");
    });

    it("does not merge across a gap of 4", () => {
      // " ab " => gap of 4 (2 chars + 2 spaces), just past the threshold.
      const changes = changesFor(para("fox ab pig"), para("cat ab dog"));

      expect(changes).toHaveLength(2);
      // The two edits stay distinct and the middle "ab" is untouched.
      expect(deletedText(changes[0])).toBe("cat");
      expect(deletedText(changes[1])).toBe("dog");
    });
  });

  it("does not affect a simple single-word change", () => {
    const changes = changesFor(
      para("Hello modified world"),
      para("Hello world")
    );

    expect(changes).toHaveLength(1);
    expect(changes[0].inserted).toHaveLength(1);
  });
});
