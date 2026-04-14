import cloneDeep from "lodash/cloneDeep";
import debounce from "lodash/debounce";
import isEqual from "lodash/isEqual";
import { observer } from "mobx-react";
import { Node } from "prosemirror-model";
import type { Selection } from "prosemirror-state";
import { AllSelection, TextSelection } from "prosemirror-state";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Prompt, useHistory, useLocation } from "react-router-dom";
import { toast } from "sonner";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { EditorStyleHelper } from "@shared/editor/styles/EditorStyleHelper";
import { s } from "@shared/styles";
import type { NavigationNode } from "@shared/types";
import { IconType, TOCPosition, TeamPreference } from "@shared/types";
import { ProsemirrorHelper } from "@shared/utils/ProsemirrorHelper";
import { TextHelper } from "@shared/utils/TextHelper";
import { determineIconType } from "@shared/utils/icon";
import { isModKey } from "@shared/utils/keyboard";
import type Document from "~/models/Document";
import Template from "~/models/Template";
import type Revision from "~/models/Revision";
import DocumentMove from "~/components/DocumentExplorer/DocumentMove";
import DocumentPublish from "~/scenes/DocumentPublish";
import ErrorBoundary from "~/components/ErrorBoundary";
import LoadingIndicator from "~/components/LoadingIndicator";
import PageTitle from "~/components/PageTitle";
import PlaceholderDocument from "~/components/PlaceholderDocument";
import RegisterKeyDown from "~/components/RegisterKeyDown";
import { MeasuredContainer } from "~/components/MeasuredContainer";
import type { Editor as TEditor } from "~/editor";
import type { Properties } from "~/types";
import { useLocationSidebarContext } from "~/hooks/useLocationSidebarContext";
import useStores from "~/hooks/useStores";
import { client } from "~/utils/ApiClient";
import { emojiToUrl } from "~/utils/emoji";
import { documentHistoryPath, documentEditPath } from "~/utils/routeHelpers";
import Container from "./Container";
import Contents from "./Contents";
import Editor from "./Editor";
import Header from "./Header";
import Notices from "./Notices";
import References from "./References";
import RevisionViewer from "./RevisionViewer";

const AUTOSAVE_DELAY = 3000;

type LocationState = {
  title?: string;
  restore?: boolean;
  revisionId?: string;
};

interface Props {
  sharedTree?: NavigationNode;
  abilities: Record<string, boolean>;
  document: Document;
  revision?: Revision;
  readOnly: boolean;
  shareId?: string;
  tocPosition?: TOCPosition | false;
  onCreateLink?: (
    params: Properties<Document>,
    nested?: boolean
  ) => Promise<string>;
  children?: React.ReactNode;
}

function DocumentScene({
  document,
  revision,
  readOnly,
  abilities,
  shareId,
  tocPosition,
  onCreateLink,
  children,
}: Props) {
  const { auth, ui, dialogs } = useStores();
  const { t } = useTranslation();
  const history = useHistory();
  const location = useLocation<LocationState>();
  const sidebarContext = useLocationSidebarContext();
  const { team, user } = auth;

  // Refs
  const editorRef = useRef<TEditor>(null);

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
  }, [document]);

  const updateIsDirtyRef = useRef(updateIsDirty);
  useEffect(() => {
    updateIsDirtyRef.current = updateIsDirty;
  });

  const updateIsDirtyDebounced = useMemo(
    () => debounce(() => updateIsDirtyRef.current(), 500),
    []
  );

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
    [document, history, sidebarContext, ui]
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
   * @param template The template to use
   * @param selection The selection to replace, if any
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
    [auth, document]
  );

  const onSynced = useCallback(async () => {
    const restore = location.state?.restore;
    const revisionId = location.state?.revisionId;
    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    // Highlight search term when navigating from search results
    const params = new URLSearchParams(location.search);
    const searchTerm = params.get("q");
    if (searchTerm) {
      editor.commands.find({ text: searchTerm });
    }

    if (!restore) {
      return;
    }

    const response = await client.post("/revisions.info", {
      id: revisionId,
    });

    if (response) {
      await replaceSelection(
        response.data,
        new AllSelection(editor.view.state.doc)
      );
      toast.success(t("Document restored"));
      history.replace(document.url, history.location.state);
    }
  }, [location, replaceSelection, t, history, document.url]);

  const onUndoRedo = useCallback(
    (event: KeyboardEvent) => {
      if (isModKey(event)) {
        event.preventDefault();

        if (event.shiftKey) {
          if (!readOnly) {
            editorRef.current?.commands.redo();
          }
        } else {
          if (!readOnly) {
            editorRef.current?.commands.undo();
          }
        }
      }
    },
    [readOnly]
  );

  const onMove = useCallback(
    (ev: React.MouseEvent | KeyboardEvent) => {
      ev.preventDefault();
      if (abilities.move) {
        dialogs.openModal({
          title: t("Move document"),
          content: <DocumentMove document={document} />,
        });
      }
    },
    [document, dialogs, t, abilities.move]
  );

  const goToEdit = useCallback(
    (ev: KeyboardEvent) => {
      if (readOnly) {
        ev.preventDefault();
        if (abilities.update) {
          history.push({
            pathname: documentEditPath(document),
            state: { sidebarContext },
          });
        }
      } else if (editorRef.current?.isBlurred) {
        ev.preventDefault();
        editorRef.current?.focus();
      }
    },
    [readOnly, abilities.update, history, document, sidebarContext]
  );

  const goToHistory = useCallback(
    (ev: KeyboardEvent) => {
      if (!readOnly) {
        return;
      }
      if (ev.ctrlKey) {
        return;
      }
      ev.preventDefault();

      if (location.pathname.endsWith("history")) {
        history.push({
          pathname: document.path,
          state: { sidebarContext },
        });
      } else {
        history.push({
          pathname: documentHistoryPath(document),
          state: { sidebarContext },
        });
      }
    },
    [readOnly, location.pathname, history, document, sidebarContext]
  );

  const onPublish = useCallback(
    (ev: React.MouseEvent | KeyboardEvent) => {
      ev.preventDefault();
      ev.stopPropagation();

      if (document.publishedAt) {
        return;
      }

      if (document?.collectionId) {
        void onSaveRef.current({
          publish: true,
          done: true,
        });
      } else {
        dialogs.openModal({
          title: t("Publish document"),
          content: <DocumentPublish document={document} />,
        });
      }
    },
    [document, dialogs, t]
  );

  const handlePublishShortcut = useCallback(
    (event: KeyboardEvent) => {
      if (isModKey(event) && event.shiftKey) {
        onPublish(event);
      }
    },
    [onPublish]
  );

  const goBack = useCallback(() => {
    if (!readOnly) {
      history.push({
        pathname: document.url,
        state: { sidebarContext },
      });
    }
  }, [readOnly, history, document, sidebarContext]);

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
      void autosave();
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
    [replaceSelection]
  );

  // componentDidMount: initial dirty check
  useEffect(() => {
    updateIsDirty();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // componentDidUpdate: when readOnly changes from true to false
  const prevReadOnlyRef = useRef(readOnly);
  useEffect(() => {
    if (prevReadOnlyRef.current && !readOnly) {
      updateIsDirty();
    }
    prevReadOnlyRef.current = readOnly;
  }, [readOnly, updateIsDirty]);

  // componentWillUnmount: auto-delete/auto-save + debounce cleanup
  useEffect(
    () => () => {
      autosave.cancel();
      updateIsDirtyDebounced.cancel();

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

  // Render
  const isShare = !!shareId;
  const embedsDisabled =
    (team && team.documentEmbeds === false) || document.embedsDisabled;

  const tocPos =
    tocPosition ??
    ((team?.getPreference(TeamPreference.TocPosition) as TOCPosition) ||
      TOCPosition.Left);
  const showContents =
    tocPos && (isShare ? ui.tocVisible !== false : ui.tocVisible === true);
  const tocOffset =
    tocPos === TOCPosition.Left
      ? EditorStyleHelper.tocWidth / -2
      : EditorStyleHelper.tocWidth / 2;

  const multiplayerEditor =
    !document.isArchived && !document.isDeleted && !revision && !isShare;

  const hasEmojiInTitle = determineIconType(document.icon) === IconType.Emoji;
  const pageTitle = hasEmojiInTitle
    ? document.titleWithDefault.replace(document.icon!, "")
    : document.titleWithDefault;
  const favicon = hasEmojiInTitle ? emojiToUrl(document.icon!) : undefined;

  const fullWidthTransformOffsetStyle = {
    ["--full-width-transform-offset"]: `${document.fullWidth && showContents ? tocOffset : 0}px`,
  } as React.CSSProperties;

  return (
    <ErrorBoundary showTitle>
      <RegisterKeyDown trigger="m" handler={onMove} />
      <RegisterKeyDown trigger="z" handler={onUndoRedo} />
      <RegisterKeyDown trigger="e" handler={goToEdit} />
      <RegisterKeyDown trigger="Escape" handler={goBack} />
      <RegisterKeyDown trigger="h" handler={goToHistory} />
      <RegisterKeyDown
        trigger="p"
        options={{
          allowInInput: true,
        }}
        handler={handlePublishShortcut}
      />
      <MeasuredContainer
        as={Background}
        name="container"
        key={revision ? revision.id : document.id}
        column
        auto
      >
        <PageTitle title={pageTitle} favicon={favicon} />
        {(isUploading || isSaving) && <LoadingIndicator />}
        <Container column>
          {!readOnly && (
            <Prompt
              when={isUploading && !isEditorDirty}
              message={t(
                `Images are still uploading.\nAre you sure you want to discard them?`
              )}
            />
          )}
          <Header
            editorRef={editorRef}
            document={document}
            revision={revision}
            isDraft={document.isDraft}
            isEditing={!readOnly && !!user?.separateEditMode}
            isSaving={isSaving}
            isPublishing={isPublishing}
            publishingIsDisabled={document.isSaving || isPublishing || isEmpty}
            savingIsDisabled={document.isSaving || isEmpty}
            onSelectTemplate={handleSelectTemplate}
            onSave={onSave}
          />
          <Main
            fullWidth={document.fullWidth}
            tocPosition={tocPos}
            style={fullWidthTransformOffsetStyle}
          >
            <React.Suspense
              fallback={
                <EditorContainer
                  docFullWidth={document.fullWidth}
                  showContents={showContents}
                  tocPosition={tocPos}
                >
                  <PlaceholderDocument />
                </EditorContainer>
              }
            >
              <MeasuredContainer
                name="document"
                as={EditorContainer}
                docFullWidth={document.fullWidth}
                showContents={showContents}
                tocPosition={tocPos}
              >
                {revision ? (
                  <RevisionViewer
                    ref={editorRef}
                    document={document}
                    revision={revision}
                    id={revision.id}
                  />
                ) : (
                  <>
                    <Notices document={document} readOnly={readOnly} />

                    {showContents && (
                      <PrintContentsContainer>
                        <Contents />
                      </PrintContentsContainer>
                    )}
                    <Editor
                      id={document.id}
                      key={embedsDisabled ? "disabled" : "enabled"}
                      ref={editorRef}
                      multiplayer={multiplayerEditor}
                      isDraft={document.isDraft}
                      document={document}
                      value={readOnly ? document.data : undefined}
                      defaultValue={document.data}
                      embedsDisabled={embedsDisabled}
                      onSynced={onSynced}
                      onFileUploadStart={onFileUploadStart}
                      onFileUploadStop={onFileUploadStop}
                      onCreateLink={onCreateLink}
                      onChangeTitle={handleChangeTitle}
                      onChangeIcon={handleChangeIcon}
                      onSave={onSave}
                      onPublish={onPublish}
                      onCancel={goBack}
                      readOnly={readOnly}
                      canUpdate={abilities.update}
                      canComment={abilities.comment}
                      autoFocus={document.createdAt === document.updatedAt}
                    >
                      <ReferencesWrapper>
                        <References document={document} />
                      </ReferencesWrapper>
                    </Editor>
                  </>
                )}
              </MeasuredContainer>
              {showContents && (
                <ContentsContainer
                  docFullWidth={document.fullWidth}
                  position={tocPos}
                >
                  <Contents />
                </ContentsContainer>
              )}
            </React.Suspense>
          </Main>
          {children}
        </Container>
      </MeasuredContainer>
    </ErrorBoundary>
  );
}

type MainProps = {
  fullWidth: boolean;
  tocPosition: TOCPosition | false;
};

const Main = styled.div<MainProps>`
  margin-top: 4px;

  ${breakpoint("tablet")`
    display: grid;
    grid-template-columns: ${({ fullWidth, tocPosition }: MainProps) =>
      fullWidth
        ? tocPosition === TOCPosition.Left
          ? `${EditorStyleHelper.tocWidth}px minmax(0, 1fr)`
          : `minmax(0, 1fr) ${EditorStyleHelper.tocWidth}px`
        : `1fr minmax(0, ${`calc(46em + ${EditorStyleHelper.documentGutter})`}) 1fr`};
  `};

  ${breakpoint("desktopLarge")`
    grid-template-columns: ${({ fullWidth, tocPosition }: MainProps) =>
      fullWidth
        ? tocPosition === TOCPosition.Left
          ? `${EditorStyleHelper.tocWidth}px minmax(0, 1fr)`
          : `minmax(0, 1fr) ${EditorStyleHelper.tocWidth}px`
        : `1fr minmax(0, ${`calc(${EditorStyleHelper.documentWidth} + ${EditorStyleHelper.documentGutter})`}) 1fr`};
  `};

  @media print {
    display: block;
    max-width: ${({ fullWidth }: MainProps) =>
      fullWidth
        ? `100%`
        : `calc(${EditorStyleHelper.documentWidth} + ${EditorStyleHelper.documentGutter})`};
  }
`;

type ContentsContainerProps = {
  docFullWidth: boolean;
  position: TOCPosition | false;
};

const ContentsContainer = styled.div<ContentsContainerProps>`
  ${breakpoint("tablet")`
    margin-top: calc(44px + 6vh);

    grid-row: 1;
    grid-column: ${({ docFullWidth, position }: ContentsContainerProps) =>
      position === TOCPosition.Left ? 1 : docFullWidth ? 2 : 3};
    justify-self: ${({ position }: ContentsContainerProps) =>
      position === TOCPosition.Left ? "end" : "start"};
  `};

  @media print {
    display: none;
  }
`;

const PrintContentsContainer = styled.div`
  display: none;
  margin: 0 -12px;

  @media print {
    display: block;
  }
`;

type EditorContainerProps = {
  docFullWidth: boolean;
  showContents: boolean;
  tocPosition: TOCPosition | false;
};

const EditorContainer = styled.div<EditorContainerProps>`
  // Adds space to the gutter to make room for icon & heading annotations
  padding: 0 44px;

  ${breakpoint("tablet")`
    grid-row: 1;

    // Decides the editor column position & span
    grid-column: ${({
      docFullWidth,
      showContents,
      tocPosition,
    }: EditorContainerProps) =>
      docFullWidth
        ? showContents
          ? tocPosition === TOCPosition.Left
            ? 2
            : 1
          : "1 / -1"
        : 2};
  `};
`;

const Background = styled(Container)`
  position: relative;
  background: ${s("background")};
`;

const ReferencesWrapper = styled.div`
  margin: 12px 0 60px;

  ${breakpoint("tablet")`
    margin-bottom: 12px;
  `}

  @media print {
    display: none;
  }
`;

export default observer(DocumentScene);
