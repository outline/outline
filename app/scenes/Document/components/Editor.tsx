import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useHistory, useRouteMatch } from "react-router-dom";
import Comment from "~/models/Comment";
import Document from "~/models/Document";
import ClickablePadding from "~/components/ClickablePadding";
import DocumentMetaWithViews from "~/components/DocumentMetaWithViews";
import Editor, { Props as EditorProps } from "~/components/Editor";
import Flex from "~/components/Flex";
import HoverPreview from "~/components/HoverPreview";
import useStores from "~/hooks/useStores";
import {
  documentHistoryUrl,
  documentUrl,
  matchDocumentHistory,
} from "~/utils/routeHelpers";
import MultiplayerEditor from "./AsyncMultiplayerEditor";
import EditableTitle from "./EditableTitle";

type Props = EditorProps & {
  onChangeTitle: (text: string) => void;
  title: string;
  id: string;
  document: Document;
  isDraft: boolean;
  multiplayer?: boolean;
  onSave: (options: {
    done?: boolean;
    autosave?: boolean;
    publish?: boolean;
  }) => void;
  children: React.ReactNode;
};

/**
 * The main document editor includes an editable title with metadata below it,
 * and support for hover previews of internal links.
 */
function DocumentEditor(props: Props, ref: React.RefObject<any>) {
  const [
    activeLinkEvent,
    setActiveLinkEvent,
  ] = React.useState<MouseEvent | null>(null);
  const titleRef = React.useRef<HTMLSpanElement>(null);
  const { t } = useTranslation();
  const match = useRouteMatch();
  const { ui, comments, auth } = useStores();
  const { user } = auth;
  const history = useHistory();

  const focusAtStart = React.useCallback(() => {
    if (ref.current) {
      ref.current.focusAtStart();
    }
  }, [ref]);

  const focusAtEnd = React.useCallback(() => {
    if (ref.current) {
      ref.current.focusAtEnd();
    }
  }, [ref]);

  const handleLinkActive = React.useCallback((event: MouseEvent) => {
    setActiveLinkEvent(event);
    return false;
  }, []);

  const handleLinkInactive = React.useCallback(() => {
    setActiveLinkEvent(null);
  }, []);

  const handleGoToNextInput = React.useCallback(
    (insertParagraph: boolean) => {
      if (insertParagraph && ref.current) {
        const { view } = ref.current;
        const { dispatch, state } = view;
        dispatch(state.tr.insert(0, state.schema.nodes.paragraph.create()));
      }

      focusAtStart();
    },
    [focusAtStart, ref]
  );

  const handleClickComment = React.useCallback(
    (commentId?: string) => {
      if (commentId) {
        ui.expandComments();
        history.replace({
          pathname: window.location.pathname.replace(/\/history$/, ""),
          search: `?commentId=${commentId}`,
        });
      } else {
        history.replace({
          pathname: window.location.pathname,
        });
      }
    },
    [ui, history]
  );

  const handleDraftComment = React.useCallback(
    (commentId: string) => {
      ui.expandComments();

      const comment = new Comment(
        {
          documentId: props.id,
        },
        comments
      );
      comment.id = commentId;
      comments.add(comment);
    },
    [comments, props.id, ui]
  );

  const handleRemoveComment = React.useCallback((commentId: string) => {
    console.log({ commentId });
  }, []);

  const {
    document,
    title,
    onChangeTitle,
    isDraft,
    shareId,
    readOnly,
    children,
    multiplayer,
    ...rest
  } = props;
  const EditorComponent = multiplayer ? MultiplayerEditor : Editor;

  return (
    <Flex auto column>
      <EditableTitle
        ref={titleRef}
        value={title}
        readOnly={readOnly}
        document={document}
        onGoToNextInput={handleGoToNextInput}
        onChange={onChangeTitle}
        starrable={!shareId}
        placeholder={t("Untitled")}
      />
      {!shareId && (
        <DocumentMetaWithViews
          isDraft={isDraft}
          document={document}
          to={
            match.path === matchDocumentHistory
              ? documentUrl(document)
              : documentHistoryUrl(document)
          }
          rtl={
            titleRef.current
              ? window.getComputedStyle(titleRef.current).direction === "rtl"
              : false
          }
        />
      )}
      <EditorComponent
        ref={ref}
        autoFocus={!!title && !props.defaultValue}
        placeholder={t("Type '/' to insert, or start writing…")}
        onHoverLink={handleLinkActive}
        scrollTo={window.location.hash}
        readOnly={readOnly}
        shareId={shareId}
        userId={user?.id}
        grow
        onClickComment={handleClickComment}
        onDraftComment={handleDraftComment}
        onRemoveComment={handleRemoveComment}
        {...rest}
      />
      {!readOnly && <ClickablePadding onClick={focusAtEnd} grow />}
      {activeLinkEvent && !shareId && (
        <HoverPreview
          node={activeLinkEvent.target as HTMLAnchorElement}
          event={activeLinkEvent}
          onClose={handleLinkInactive}
        />
      )}
      {children}
    </Flex>
  );
}

export default observer(React.forwardRef(DocumentEditor));
