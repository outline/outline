import cloneDeep from "lodash/cloneDeep";
import debounce from "lodash/debounce";
import isEqual from "lodash/isEqual";
import { Node } from "prosemirror-model";
import type { Selection } from "prosemirror-state";
import { AllSelection, TextSelection } from "prosemirror-state";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useHistory } from "react-router-dom";
import { toast } from "sonner";
import { ProsemirrorHelper } from "@shared/utils/ProsemirrorHelper";
import { TextHelper } from "@shared/utils/TextHelper";
import type Document from "~/models/Document";
import Template from "~/models/Template";
import type Revision from "~/models/Revision";
import type { Editor as TEditor } from "~/editor";
import { useLocationSidebarContext } from "~/hooks/useLocationSidebarContext";
import useStores from "~/hooks/useStores";
import { documentEditPath } from "~/utils/routeHelpers";

const AUTOSAVE_DELAY = 3000;

interface UseDocumentSaveOptions {
  /** The document model being edited. */
  document: Document;
  /** Ref to the editor instance. */
  editorRef: React.RefObject<TEditor | null>;
  /** Whether the document is currently in read-only mode. */
  readOnly: boolean;
}

interface UseDocumentSaveResult {
  isUploading: boolean;
  isSaving: boolean;
  isPublishing: boolean;
  isEditorDirty: boolean;
  isEmpty: boolean;
  onSave: (options?: {
    done?: boolean;
    publish?: boolean;
    autosave?: boolean;
  }) => Promise<void>;
  replaceSelection: (
    template: Template | Revision,
    selection?: Selection
  ) => Promise<void> | undefined;
  handleSelectTemplate: (
    template: Template | Revision
  ) => Promise<void> | undefined;
  handleChangeTitle: (value: string) => void;
  handleChangeIcon: (icon: string | null, color: string | null) => void;
  onFileUploadStart: () => void;
  onFileUploadStop: () => void;
}

/**
 * Hook that encapsulates save, autosave, dirty-tracking, and template
 * insertion logic for the document editor scene.
 *
 * @param options - the document, editor ref, and readOnly flag.
 * @returns state values and callbacks for save/dirty management.
 */
export function useDocumentSave({
  document,
  editorRef,
  readOnly,
}: UseDocumentSaveOptions): UseDocumentSaveResult {
  const { auth, ui } = useStores();
  const history = useHistory();
  const sidebarContext = useLocationSidebarContext();

  // State
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isEditorDirty, setIsEditorDirty] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [title, setTitle] = useState(document.title);

  // Companion refs for stale closure avoidance
  const isEditorDirtyRef = useRef(isEditorDirty);
  isEditorDirtyRef.current = isEditorDirty;
  const isEmptyRef = useRef(isEmpty);
  isEmptyRef.current = isEmpty;
  const titleRef = useRef(title);
  titleRef.current = title;

  const updateIsDirty = useCallback(() => {
    const doc = editorRef.current?.view.state.doc;
    const dirty = !isEqual(doc?.toJSON(), document.data);
    setIsEditorDirty(dirty);
    isEditorDirtyRef.current = dirty;
    const empty = (!doc || ProsemirrorHelper.isEmpty(doc)) && !titleRef.current;
    setIsEmpty(empty);
    isEmptyRef.current = empty;
  }, [document, editorRef]);

  const updateIsDirtyRef = useRef(updateIsDirty);
  useEffect(() => {
    updateIsDirtyRef.current = updateIsDirty;
  });

  const onSave = useCallback(
    async (
      options: {
        done?: boolean;
        publish?: boolean;
        autosave?: boolean;
      } = {}
    ) => {
      // prevent saves when we are already saving
      if (document.isSaving) {
        return;
      }

      // get the latest version of the editor text value
      const doc = editorRef.current?.view.state.doc;
      if (!doc) {
        return;
      }

      // prevent save before anything has been written (single hash is empty doc)
      if (ProsemirrorHelper.isEmpty(doc) && document.title.trim() === "") {
        return;
      }

      document.data = doc.toJSON();
      document.tasks = ProsemirrorHelper.getTasksSummary(doc);

      // prevent autosave if nothing has changed
      if (
        options.autosave &&
        !isEditorDirtyRef.current &&
        !document.isDirty()
      ) {
        return;
      }

      setIsSaving(true);
      setIsPublishing(!!options.publish);

      try {
        const savedDocument = await document.save(undefined, options);
        setIsEditorDirty(false);
        isEditorDirtyRef.current = false;

        if (options.done) {
          history.push({
            pathname: savedDocument.url,
            state: { sidebarContext },
          });
          ui.setActiveDocument(savedDocument);
        } else if (document.isNew) {
          history.push({
            pathname: documentEditPath(savedDocument),
            state: { sidebarContext },
          });
          ui.setActiveDocument(savedDocument);
        }
      } catch (err) {
        toast.error(err.message);
      } finally {
        setIsSaving(false);
        setIsPublishing(false);
      }
    },
    [document, editorRef, history, sidebarContext, ui]
  );

  const onSaveRef = useRef(onSave);
  useEffect(() => {
    onSaveRef.current = onSave;
  });

  const autosave = useMemo(
    () =>
      debounce(
        () =>
          void onSaveRef.current({
            done: false,
            autosave: true,
          }),
        AUTOSAVE_DELAY
      ),
    []
  );

  /**
   * Replaces the given selection with a template, if no selection is provided
   * then the template is inserted at the beginning of the document.
   *
   * @param template the template to use.
   * @param selection the selection to replace, if any.
   */
  const replaceSelection = useCallback(
    (template: Template | Revision, selection?: Selection) => {
      const editor = editorRef.current;

      if (!editor) {
        return;
      }

      const { view, schema } = editor;
      const sel = selection ?? TextSelection.near(view.state.doc.resolve(0));
      const doc = Node.fromJSON(
        schema,
        ProsemirrorHelper.replaceTemplateVariables(template.data, auth.user!)
      );

      if (doc) {
        view.dispatch(
          view.state.tr.setSelection(sel).replaceSelectionWith(doc)
        );
      }

      setIsEditorDirty(true);
      isEditorDirtyRef.current = true;

      if (template instanceof Template) {
        document.templateId = template.id;
        document.fullWidth = template.fullWidth;
      }

      if (!titleRef.current) {
        const newTitle = TextHelper.replaceTemplateVariables(
          template.title,
          auth.user!
        );
        setTitle(newTitle);
        titleRef.current = newTitle;
        document.title = newTitle;
      }
      if (template.icon) {
        document.icon = template.icon;
      }
      if (template.color) {
        document.color = template.color;
      }

      document.data = cloneDeep(template.data);
      updateIsDirtyRef.current();

      return onSaveRef.current({
        autosave: true,
        publish: false,
        done: false,
      });
    },
    [auth, document, editorRef]
  );

  const handleSelectTemplate = useCallback(
    async (template: Template | Revision) => {
      const editor = editorRef.current;
      if (!editor) {
        return;
      }

      const { view } = editor;
      const doc = view.state.doc;

      return replaceSelection(
        template,
        ProsemirrorHelper.isEmpty(doc)
          ? new AllSelection(doc)
          : view.state.selection
      );
    },
    [editorRef, replaceSelection]
  );

  const onFileUploadStart = useCallback(() => {
    setIsUploading(true);
  }, []);

  const onFileUploadStop = useCallback(() => {
    setIsUploading(false);
  }, []);

  const handleChangeTitle = useCallback(
    (value: string) => {
      setTitle(value);
      titleRef.current = value;
      document.title = value;
      updateIsDirtyRef.current();
      autosave();
    },
    [document, autosave]
  );

  const handleChangeIcon = useCallback(
    (icon: string | null, color: string | null) => {
      document.icon = icon;
      document.color = color;
      void onSaveRef.current();
    },
    [document]
  );

  // Initial dirty check on mount
  useEffect(() => {
    updateIsDirty();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When readOnly changes from true to false, recalculate dirty state
  const prevReadOnlyRef = useRef(readOnly);
  useEffect(() => {
    if (prevReadOnlyRef.current && !readOnly) {
      updateIsDirty();
    }
    prevReadOnlyRef.current = readOnly;
  }, [readOnly, updateIsDirty]);

  // Auto-delete/auto-save on unmount + debounce cleanup
  useEffect(
    () => () => {
      autosave.cancel();

      if (
        isEmptyRef.current &&
        document.createdBy?.id === auth.user?.id &&
        document.isDraft &&
        document.isActive &&
        document.hasEmptyTitle &&
        document.isPersistedOnce
      ) {
        void document.delete();
      } else if (document.isDirty()) {
        void document.save(undefined, {
          autosave: true,
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return {
    isUploading,
    isSaving,
    isPublishing,
    isEditorDirty,
    isEmpty,
    onSave,
    replaceSelection,
    handleSelectTemplate,
    handleChangeTitle,
    handleChangeIcon,
    onFileUploadStart,
    onFileUploadStop,
  };
}
