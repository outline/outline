import * as Y from "yjs";
import { resolveAnchorToProseMirror } from "./anchorResolver";

describe("anchorResolver", () => {
  describe("resolveAnchorToProseMirror", () => {
    it("should return orphaned when yjsDocState is null", () => {
      const anchor = {
        from: "test",
        fromAssoc: 1 as const,
        to: "test",
        toAssoc: 1 as const,
      };

      const result = resolveAnchorToProseMirror(anchor, null);

      expect(result.method).toBe("orphaned");
      expect(result.confidence).toBe(0);
      expect(result.pmFrom).toBeUndefined();
      expect(result.pmTo).toBeUndefined();
    });

    it("should return orphaned for invalid base64 encoding", () => {
      const ydoc = new Y.Doc();
      const state = Y.encodeStateAsUpdate(ydoc);

      const anchor = {
        from: "!!!invalid-base64!!!",
        fromAssoc: 1 as const,
        to: "!!!invalid-base64!!!",
        toAssoc: 1 as const,
      };

      const result = resolveAnchorToProseMirror(anchor, Buffer.from(state));

      expect(result.method).toBe("orphaned");
      expect(result.confidence).toBe(0);
    });

    it("should resolve valid anchor positions", () => {
      const ydoc = new Y.Doc();
      const yFragment = ydoc.get("default", Y.XmlFragment);

      // Create some content
      const yText = new Y.XmlText();
      yText.insert(0, "Hello World");
      yFragment.insert(0, [yText]);

      // Create relative positions
      const fromRelPos = Y.createRelativePositionFromTypeIndex(yFragment, 0, 1);
      const toRelPos = Y.createRelativePositionFromTypeIndex(yFragment, 5, 1);

      // Encode to base64
      const fromB64 = Buffer.from(
        Y.encodeRelativePosition(fromRelPos)
      ).toString("base64");
      const toB64 = Buffer.from(Y.encodeRelativePosition(toRelPos)).toString(
        "base64"
      );

      const anchor = {
        from: fromB64,
        fromAssoc: 1 as const,
        to: toB64,
        toAssoc: 1 as const,
      };

      const state = Y.encodeStateAsUpdate(ydoc);
      const result = resolveAnchorToProseMirror(anchor, Buffer.from(state));

      expect(result.method).toBe("relative");
      expect(result.confidence).toBe(1.0);
      expect(result.pmFrom).toBeDefined();
      expect(result.pmTo).toBeDefined();
    });
  });
});
