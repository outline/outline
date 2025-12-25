import { action, computed, observable } from "mobx";
import type { PropsWithChildren } from "react";
import { createContext, useContext, useMemo } from "react";
import type { Heading } from "@shared/utils/ProsemirrorHelper";
import type Document from "~/models/Document";
import type { Editor } from "~/editor";

class DocumentContext {
  /** The current document */
  document?: Document;

  /** The editor instance for this document */
  editor?: Editor;

  /** The ID of the currently focused comment, or null if no comment is focused */
  @observable
  focusedCommentId: string | null = null;

  /** Whether the editor has been initialized */
  @observable
  isEditorInitialized: boolean = false;

  /** The headings in the document */
  @observable
  headings: Heading[] = [];

  @computed
  get hasHeadings() {
    return this.headings.length > 0;
  }

  @action
  setDocument = (document: Document) => {
    this.document = document;
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
    this.document?.updateTasks(total, completed);
  }
}

const Context = createContext<DocumentContext | null>(null);

export const useDocumentContext = () => {
  const ctx = useContext(Context);
  if (!ctx) {
    throw new Error(
      "useDocumentContext must be used within DocumentContextProvider"
    );
  }
  return ctx;
};

export const DocumentContextProvider = ({
  children,
}: PropsWithChildren<unknown>) => {
  const context = useMemo(() => new DocumentContext(), []);
  return <Context.Provider value={context}>{children}</Context.Provider>;
};
