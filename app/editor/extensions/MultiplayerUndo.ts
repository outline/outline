import {
  yUndoPlugin,
  undo,
  redo,
  undoCommand,
  redoCommand,
} from "y-prosemirror";
import Extension from "@shared/editor/lib/Extension";

/**
 * Undo and redo for collaborative documents, backed by the Yjs undo manager.
 * Must be registered after the Multiplayer extension, whose sync plugin it
 * depends on. It is not created in read-only mode, so the undo manager is
 * created fresh when the editor becomes editable.
 */
export class MultiplayerUndo extends Extension {
  get name() {
    return "multiplayerUndo";
  }

  get plugins() {
    return [yUndoPlugin()];
  }

  commands() {
    return {
      undo: () => undo,
      redo: () => redo,
    };
  }

  keys() {
    return {
      "Mod-z": undoCommand,
      "Mod-y": redoCommand,
      "Shift-Mod-z": redoCommand,
    };
  }
}
