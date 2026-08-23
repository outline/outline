import { action, computed, observable } from "mobx";
import type { PropsWithChildren } from "react";
import { createContext, useContext, useMemo } from "react";
import type { Heading } from "@shared/utils/ProsemirrorHelper";
import type Note from "~/models/Note";
import type { Editor } from "~/editor";
class NoteContext {
  /** The current note */
  note?: Note;
  /** The editor instance for this note */
  editor?: Editor;
  /** The ID of the currently focused comment, or null if no comment is focused */
  @observable
  focusedCommentId: string | null = null;
  /** Whether the editor has been initialized */
  @observable
  isEditorInitialized: boolean = false;
  /** The headings in the note */
  @observable
  headings: Heading[] = [];
  @computed
  get hasHeadings() {
    return this.headings.length > 0;
  }
  @action
  setNote = (note: Note) => {
    // Reset the focused comment when navigating between notes
    if (this.note && this.note.id !== note.id) {
      this.focusedCommentId = null;
    }
    this.note = note;
    this.updateState();
  };
  @action
  setEditor = (editor: Editor) => {
    this.editor = editor;
    this.updateState();
  };
  @action
  setEditorInitialized = (initialized: boolean) => {
    this.isEditorInitialized = initialized;
  };
  @action
  setFocusedCommentId = (commentId: string | null) => {
    this.focusedCommentId = commentId;
  };
  @action
  updateState = () => {
    this.updateHeadings();
    this.updateTasks();
  };
  private updateHeadings() {
    const currHeadings = this.editor?.getHeadings() ?? [];
    const hasChanged =
      currHeadings.map((h) => h.level + h.title).join("") !==
      this.headings.map((h) => h.level + h.title).join("");
    if (hasChanged) {
      this.headings = currHeadings;
    }
  }
  private updateTasks() {
    const tasks = this.editor?.getTasks() ?? [];
    const total = tasks.length ?? 0;
    const completed = tasks.filter((t) => t.completed).length ?? 0;
    this.note?.updateTasks(total, completed);
  }
}
const Context = createContext<NoteContext | null>(null);
export const useNoteContext = () => {
  const ctx = useContext(Context);
  if (!ctx) {
    throw new Error("useNoteContext must be used within NoteContextProvider");
  }
  return ctx;
};
export const NoteContextProvider = ({
  children,
}: PropsWithChildren<unknown>) => {
  const context = useMemo(() => new NoteContext(), []);
  return <Context.Provider value={context}>{children}</Context.Provider>;
};
