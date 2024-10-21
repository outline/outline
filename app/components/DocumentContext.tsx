import { action, computed, observable } from "mobx";
import React, { PropsWithChildren } from "react";
import { Heading } from "@shared/utils/ProsemirrorHelper";
import Document from "~/models/Document";
import { Editor } from "~/editor";

class DocumentContext {
  /** The current document */
  document?: Document;

  /** The editor instance for this document */
  editor?: Editor;

  @observable
  isEditorInitialized: boolean = false;

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

const Context = React.createContext<DocumentContext | null>(null);

export const useDocumentContext = () => {
  const ctx = React.useContext(Context);
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
  const context = React.useMemo(() => new DocumentContext(), []);
  return <Context.Provider value={context}>{children}</Context.Provider>;
};
