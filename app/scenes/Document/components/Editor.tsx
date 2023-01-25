import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { mergeRefs } from "react-merge-refs";
import { useRouteMatch } from "react-router-dom";
import fullPackage from "@shared/editor/packages/full";
import Document from "~/models/Document";
import { RefHandle } from "~/components/ContentEditable";
import DocumentMetaWithViews from "~/components/DocumentMetaWithViews";
import Editor, { Props as EditorProps } from "~/components/Editor";
import Flex from "~/components/Flex";
import {
  documentHistoryUrl,
  documentUrl,
  matchDocumentHistory,
} from "~/utils/routeHelpers";
import { useDocumentContext } from "../../../components/DocumentContext";
import MultiplayerEditor from "./AsyncMultiplayerEditor";
import EditableTitle from "./EditableTitle";

type Props = Omit<EditorProps, "extensions"> & {
  onChangeTitle: (text: string) => void;
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
  const titleRef = React.useRef<RefHandle>(null);
  const { t } = useTranslation();
  const match = useRouteMatch();
  const {
    document,
    onChangeTitle,
    isDraft,
    shareId,
    readOnly,
    children,
    multiplayer,
    ...rest
  } = props;

  const childRef = React.useRef<HTMLDivElement>(null);
  const focusAtStart = React.useCallback(() => {
    if (ref.current) {
      ref.current.focusAtStart();
    }
  }, [ref]);

  // Save document when blurring title, but delay so that if clicking on a
  // button this is allowed to execute first.
  const handleBlur = React.useCallback(() => {
    setTimeout(() => props.onSave({ autosave: true }), 250);
  }, [props]);

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

  const { setEditor } = useDocumentContext();
  const handleRefChanged = React.useCallback(setEditor, [setEditor]);

  const EditorComponent = multiplayer ? MultiplayerEditor : Editor;

  return (
    <Flex auto column>
      <EditableTitle
        ref={titleRef}
        readOnly={readOnly}
        document={document}
        onGoToNextInput={handleGoToNextInput}
        onChange={onChangeTitle}
        onBlur={handleBlur}
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
            titleRef.current?.getComputedDirection() === "rtl" ? true : false
          }
        />
      )}
      <EditorComponent
        ref={mergeRefs([ref, handleRefChanged])}
        autoFocus={!!document.title && !props.defaultValue}
        placeholder={t("Type '/' to insert, or start writing…")}
        scrollTo={decodeURIComponent(window.location.hash)}
        readOnly={readOnly}
        shareId={shareId}
        extensions={fullPackage}
        bottomPadding={`calc(50vh - ${childRef.current?.offsetHeight || 0}px)`}
        {...rest}
      />
      <div ref={childRef}>{children}</div>
    </Flex>
  );
}

export default observer(React.forwardRef(DocumentEditor));
