// @flow
import { debounce } from "lodash";
import { observer } from "mobx-react";
import { InputIcon } from "outline-icons";
import * as React from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useHistory, useRouteMatch, Route, Prompt } from "react-router-dom";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import Document from "models/Document";
import Revision from "models/Revision";
import Branding from "components/Branding";
import ErrorBoundary from "components/ErrorBoundary";
import Flex from "components/Flex";
import LoadingIndicator from "components/LoadingIndicator";
import LoadingPlaceholder from "components/LoadingPlaceholder";
import Notice from "components/Notice";
import PageTitle from "components/PageTitle";
import Time from "components/Time";
import Container from "./Container";
import Contents from "./Contents";
import DocumentMove from "./DocumentMove";
import Editor from "./Editor";
import Header from "./Header";
import KeyboardShortcutsButton from "./KeyboardShortcutsButton";
import MarkAsViewed from "./MarkAsViewed";
import References from "./References";
import useStores from "hooks/useStores";
import { type Theme } from "types";
import { isCustomDomain } from "utils/domains";
import { emojiToUrl } from "utils/emoji";
import { meta } from "utils/keyboard";
import {
  collectionUrl,
  documentMoveUrl,
  documentHistoryUrl,
  editDocumentUrl,
  documentUrl,
} from "utils/routeHelpers";

const AUTOSAVE_DELAY = 3000;
const IS_DIRTY_DELAY = 500;
const DISCARD_CHANGES = `
You have unsaved changes.
Are you sure you want to discard them?
`;
const UPLOADING_WARNING = `
Images are still uploading.
Are you sure you want to discard them?
`;

type Props = {
  abilities: Object,
  document: Document,
  revision: Revision,
  readOnly: boolean,
  onCreateLink: (title: string) => Promise<string>,
  onSearchLink: (term: string) => any,
  theme: Theme,
};

function DocumentScene({
  document,
  revision,
  abilities,
  readOnly,
  onCreateLink,
  onSearchLink,
  theme,
}: Props) {
  const match = useRouteMatch();
  const history = useHistory();

  const { auth, ui } = useStores();
  const editor = React.useRef();
  const [isUploading, setIsUploading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isPublishing, setIsPublishing] = React.useState(false);
  const [isDirty, setIsDirty] = React.useState(false);
  const [isEmpty, setIsEmpty] = React.useState(true);

  const [lastRevision, setLastRevision] = React.useState(document.revision);
  const [title, setTitle] = React.useState(document.title);

  const [editorText, setEditorText] = React.useState(document.text);

  const team = auth.team;
  const isShare = !!match.params.shareId;

  const value = revision ? revision.text : document.text;
  const injectTemplate = document.injectTemplate;
  const disableEmbeds =
    (team && team.documentEmbeds === false) || document.embedsDisabled;

  const headings = editor.current ? editor.current.getHeadings() : [];
  const showContents =
    (ui.tocVisible && readOnly) || (isShare && !!headings.length);

  const updateIsDirty = React.useCallback(() => {
    const trimmedEditorText = editorText.trim();
    const titleChanged = title !== document.title;
    const bodyChanged = editorText !== document.text.trim();

    // a single hash is a doc with just an empty title
    setIsEmpty((!trimmedEditorText || trimmedEditorText === "#") && !title);
    setIsDirty(bodyChanged || titleChanged);
  }, [document.text, document.title, editorText, title]);

  React.useEffect(() => {
    if (!readOnly) {
      updateIsDirty();
    }
    if (readOnly) {
      setLastRevision(document.revision);

      if (document.title !== title) {
        setTitle(document.title);
      }
    } else {
      if (auth.user && document.updatedBy.id !== auth.user.id) {
        ui.showToast(`Document updated by ${document.updatedBy.name}`, {
          timeout: 30 * 1000,
          type: "warning",
          action: {
            text: "Reload",
            onClick: () => {
              window.location.href = documentUrl(document);
            },
          },
        });
      }
    }

    if (document.injectTemplate) {
      document.injectTemplate = false;
      setTitle(document.title);
      setIsDirty(true);
    }
  }, [
    document.revision,
    auth.user,
    document,
    readOnly,
    title,
    ui,
    updateIsDirty,
  ]);

  const goToMove = (ev) => {
    if (!readOnly) return;
    ev.preventDefault();

    if (abilities.move) {
      history.push(documentMoveUrl(document));
    }
  };

  const goToEdit = (ev) => {
    if (!readOnly) return;

    ev.preventDefault();

    if (abilities.update) {
      history.push(editDocumentUrl(document));
    }
  };

  const goBack = (ev) => {
    if (readOnly) return;

    ev.preventDefault();
    history.goBack();
  };

  const goToHistory = (ev) => {
    if (!readOnly) return;

    ev.preventDefault();

    if (revision) {
      history.push(document.url);
    } else {
      history.push(documentHistoryUrl(document));
    }
  };

  const onPublish = async (ev) => {
    ev.preventDefault();
    if (document.publishedAt) return;
    await onSave({ publish: true, done: true });
  };

  const onToggleTableOfContents = (ev) => {
    if (!readOnly) return;

    ev.preventDefault();

    if (ui.tocVisible) {
      ui.hideTableOfContents();
    } else {
      ui.showTableOfContents();
    }
  };

  useHotkeys("m", goToMove);
  useHotkeys("e", goToEdit);

  useHotkeys("esc", goBack);

  useHotkeys("h", goToHistory);

  useHotkeys(`${meta}+shift+p`, onPublish);

  useHotkeys(`${meta}+ctrl+h`, onToggleTableOfContents);

  const onSave = async (
    options: {
      done?: boolean,
      publish?: boolean,
      autosave?: boolean,
    } = {}
  ) => {
    // prevent saves when we are already saving
    if (document.isSaving) return;

    // get the latest version of the editor text value
    const text = editorText ? editorText : document.text;

    // prevent save before anything has been written (single hash is empty doc)
    if (text.trim() === "" && title.trim === "") return;

    // prevent autosave if nothing has changed
    if (
      options.autosave &&
      document.text.trim() === text.trim() &&
      document.title.trim() === title.trim()
    )
      return;

    document.title = title;
    document.text = text;

    let isNew = !document.id;
    setIsSaving(true);
    setIsPublishing(!!options.publish);

    try {
      const savedDocument = await document.save({
        ...options,
        lastRevision: lastRevision,
      });
      setIsDirty(false);
      setLastRevision(savedDocument.revision);

      if (options.done) {
        history.push(savedDocument.url);
        ui.setActiveDocument(savedDocument);
      } else if (isNew) {
        history.push(editDocumentUrl(savedDocument));
        ui.setActiveDocument(savedDocument);
      }
    } catch (err) {
      ui.showToast(err.message, { type: "error" });
    } finally {
      setIsSaving(false);
      setIsPublishing(false);
    }
  };

  const autosave = debounce(async () => {
    await onSave({ done: false, autosave: true });
  }, AUTOSAVE_DELAY);

  const updateIsDirtyDebounced = debounce(updateIsDirty, IS_DIRTY_DELAY);

  const onImageUploadStart = () => {
    setIsUploading(true);
  };

  const onImageUploadStop = () => {
    setIsUploading(false);
  };

  const onChange = async (getEditorText) => {
    setEditorText(getEditorText);

    // document change while read only is presumed to be a checkbox edit,
    // in that case we don't delay in saving for a better user experience.
    if (readOnly) {
      updateIsDirty();
      await onSave({ done: false, autosave: true });
    } else {
      updateIsDirtyDebounced();
      await autosave();
    }
  };

  const onChangeTitle = async (event) => {
    setTitle(event.target.value);
    updateIsDirtyDebounced();
    await autosave();
  };

  const goBackForDocumentMove = () => {
    let url;
    if (document.url) {
      url = document.url;
    } else if (match.params.id) {
      url = collectionUrl(match.params.id);
    }
    if (url) {
      history.push(url);
    }
  };

  return (
    <ErrorBoundary>
      <Background
        key={revision ? revision.id : document.id}
        isShare={isShare}
        column
        auto
      >
        <Route
          path={`${match.url}/move`}
          component={() => (
            <DocumentMove
              document={document}
              onRequestClose={goBackForDocumentMove}
            />
          )}
        />
        <PageTitle
          title={document.titleWithDefault.replace(document.emoji, "")}
          favicon={document.emoji ? emojiToUrl(document.emoji) : undefined}
        />
        {(isUploading || isSaving) && <LoadingIndicator />}

        <Container justify="center" column auto>
          {!readOnly && (
            <>
              <Prompt
                when={isDirty && !isUploading}
                message={DISCARD_CHANGES}
              />
              <Prompt
                when={isUploading && !isDirty}
                message={UPLOADING_WARNING}
              />
            </>
          )}
          {!isShare && (
            <Header
              document={document}
              isRevision={!!revision}
              isDraft={document.isDraft}
              isEditing={!readOnly}
              isSaving={isSaving}
              isPublishing={isPublishing}
              publishingIsDisabled={
                document.isSaving || isPublishing || isEmpty
              }
              savingIsDisabled={document.isSaving || isEmpty}
              goBack={goBack}
              onSave={onSave}
            />
          )}
          <MaxWidth
            archived={document.isArchived}
            showContents={showContents}
            column
            auto
          >
            {document.isTemplate && !readOnly && (
              <Notice muted>
                You’re editing a template. Highlight some text and use the{" "}
                <PlaceholderIcon color="currentColor" /> control to add
                placeholders that can be filled out when creating new documents
                from this template.
              </Notice>
            )}
            {document.archivedAt && !document.deletedAt && (
              <Notice muted>
                Archived by {document.updatedBy.name}{" "}
                <Time dateTime={document.archivedAt} /> ago
              </Notice>
            )}
            {document.deletedAt && (
              <Notice muted>
                Deleted by {document.updatedBy.name}{" "}
                <Time dateTime={document.deletedAt} /> ago
                {document.permanentlyDeletedAt && (
                  <>
                    <br />
                    This {document.noun} will be permanently deleted in{" "}
                    <Time dateTime={document.permanentlyDeletedAt} /> unless
                    restored.
                  </>
                )}
              </Notice>
            )}
            <React.Suspense fallback={<LoadingPlaceholder />}>
              <Flex auto={!readOnly}>
                {showContents && <Contents headings={headings} />}
                <Editor
                  id={document.id}
                  innerRef={editor}
                  isShare={isShare}
                  isDraft={document.isDraft}
                  template={document.isTemplate}
                  key={[injectTemplate, disableEmbeds].join("-")}
                  title={revision ? revision.title : title}
                  document={document}
                  value={readOnly ? value : undefined}
                  defaultValue={value}
                  disableEmbeds={disableEmbeds}
                  onImageUploadStart={onImageUploadStart}
                  onImageUploadStop={onImageUploadStop}
                  onSearchLink={onSearchLink}
                  onCreateLink={onCreateLink}
                  onChangeTitle={onChangeTitle}
                  onChange={onChange}
                  onSave={onSave}
                  onPublish={onPublish}
                  onCancel={goBack}
                  readOnly={readOnly}
                  readOnlyWriteCheckboxes={readOnly && abilities.update}
                  ui={ui}
                />
              </Flex>
              {!isShare && !revision && (
                <>
                  <MarkAsViewed document={document} />
                  <ReferencesWrapper isOnlyTitle={document.isOnlyTitle}>
                    <References document={document} />
                  </ReferencesWrapper>
                </>
              )}
            </React.Suspense>
          </MaxWidth>
        </Container>
      </Background>
      {isShare && !isCustomDomain() && <Branding />}
      {!isShare && <KeyboardShortcutsButton />}
    </ErrorBoundary>
  );
}

const PlaceholderIcon = styled(InputIcon)`
  position: relative;
  top: 6px;
`;

const Background = styled(Container)`
  background: ${(props) => props.theme.background};
  transition: ${(props) => props.theme.backgroundTransition};
`;

const ReferencesWrapper = styled("div")`
  margin-top: ${(props) => (props.isOnlyTitle ? -45 : 16)}px;

  @media print {
    display: none;
  }
`;

const MaxWidth = styled(Flex)`
  ${(props) =>
    props.archived && `* { color: ${props.theme.textSecondary} !important; } `};
  padding: 0 12px;
  max-width: 100vw;
  width: 100%;

  ${breakpoint("tablet")`	
    padding: 0 24px;
    margin: 4px auto 12px;
    max-width: calc(48px + ${(props) =>
      props.showContents ? "64em" : "46em"});
  `};

  ${breakpoint("desktopLarge")`
    max-width: calc(48px + 46em);
  `};
`;

export default observer(DocumentScene);
