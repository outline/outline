import * as Y from "yjs";
import type { AnchorRange, ResolvedPosition } from "@shared/types";

/**
 * Resolves a Yjs RelativePosition anchor to ProseMirror positions.
 *
 * @param anchorRange The anchor range with base64-encoded relative positions.
 * @param yjsDocState The Yjs document state buffer.
 * @returns resolved position information.
 */
export function resolveAnchorToProseMirror(
  anchorRange: AnchorRange,
  yjsDocState: Buffer | null
): ResolvedPosition {
  if (!yjsDocState) {
    return { method: "orphaned", confidence: 0 };
  }

  try {
    const ydoc = new Y.Doc();
    Y.applyUpdate(ydoc, yjsDocState);
    
    const yFragment = ydoc.get("default", Y.XmlFragment);
    
    const fromB64 = Buffer.from(anchorRange.from, "base64");
    const toB64 = Buffer.from(anchorRange.to, "base64");
    
    const fromRelPos = Y.decodeRelativePosition(fromB64);
    const toRelPos = Y.decodeRelativePosition(toB64);
    
    if (!fromRelPos || !toRelPos) {
      return { method: "orphaned", confidence: 0 };
    }
    
    const fromAbsPos = Y.createAbsolutePositionFromRelativePosition(fromRelPos, ydoc);
    const toAbsPos = Y.createAbsolutePositionFromRelativePosition(toRelPos, ydoc);
    
    if (!fromAbsPos || !toAbsPos) {
      return { method: "orphaned", confidence: 0 };
    }
    
    const pmFromPos = fromAbsPos.index;
    const pmToPos = toAbsPos.index;
    
    return {
      method: "relative",
      confidence: 1.0,
      pmFrom: pmFromPos,
      pmTo: pmToPos,
    };
  } catch (err) {
    return { method: "orphaned", confidence: 0 };
  }
}
