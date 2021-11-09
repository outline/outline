// @flow
import { observable } from "mobx";
import { inject, observer } from "mobx-react";
import * as React from "react";
import { type TFunction, withTranslation } from "react-i18next";
import PoliciesStore from "stores/PoliciesStore";
import Document from "models/Document";
import ClickablePadding from "components/ClickablePadding";
import DocumentMetaWithViews from "components/DocumentMetaWithViews";
import Editor, { type Props as EditorProps } from "components/Editor";
import Flex from "components/Flex";
import HoverPreview from "components/HoverPreview";
import EditableTitle from "./EditableTitle";
import MultiplayerEditor from "./MultiplayerEditor";
import { documentHistoryUrl } from "utils/routeHelpers";

type Props = {|
  ...EditorProps,
  onChangeTitle: (text: string) => void,
  title: string,
  document: Document,
  isDraft: boolean,
  shareId: ?string,
  multiplayer?: boolean,
  onSave: ({ done?: boolean, autosave?: boolean, publish?: boolean }) => any,
  innerRef: { current: any },
  children: React.Node,
  policies: PoliciesStore,
  t: TFunction,
|};

@observer
class DocumentEditor extends React.Component<Props> {
  @observable activeLinkEvent: ?MouseEvent;
  ref = React.createRef<HTMLDivElement | HTMLInputElement>();

  focusAtStart = () => {
    if (this.props.innerRef.current) {
      this.props.innerRef.current.focusAtStart();
    }
  };

  focusAtEnd = () => {
    if (this.props.innerRef.current) {
      this.props.innerRef.current.focusAtEnd();
    }
  };

  insertParagraph = () => {
    if (this.props.innerRef.current) {
      const { view } = this.props.innerRef.current;
      const { dispatch, state } = view;
      dispatch(state.tr.insert(0, state.schema.nodes.paragraph.create()));
    }
  };

  handleLinkActive = (event: MouseEvent) => {
    this.activeLinkEvent = event;
  };

  handleLinkInactive = () => {
    this.activeLinkEvent = null;
  };

  handleGoToNextInput = (insertParagraph: boolean) => {
    if (insertParagraph) {
      this.insertParagraph();
    }
    this.focusAtStart();
  };

  render() {
    const {
      document,
      title,
      onChangeTitle,
      isDraft,
      shareId,
      readOnly,
      innerRef,
      children,
      policies,
      multiplayer,
      t,
      ...rest
    } = this.props;

    const EditorComponent = multiplayer ? MultiplayerEditor : Editor;

    return (
      <Flex auto column>
        <EditableTitle
          value={title}
          readOnly={readOnly}
          document={document}
          onGoToNextInput={this.handleGoToNextInput}
          onChange={onChangeTitle}
        />
        {!shareId && (
          <DocumentMetaWithViews
            isDraft={isDraft}
            document={document}
            to={documentHistoryUrl(document)}
            rtl={
              this.ref.current
                ? window.getComputedStyle(this.ref.current).direction === "rtl"
                : false
            }
          />
        )}
        <EditorComponent
          ref={innerRef}
          autoFocus={!!title && !this.props.defaultValue}
          placeholder={t("…the rest is up to you")}
          onHoverLink={this.handleLinkActive}
          scrollTo={window.location.hash}
          readOnly={readOnly}
          shareId={shareId}
          grow
          {...rest}
        />
        {!readOnly && <ClickablePadding onClick={this.focusAtEnd} grow />}
        {this.activeLinkEvent && !shareId && readOnly && (
          <HoverPreview
            node={this.activeLinkEvent.target}
            event={this.activeLinkEvent}
            onClose={this.handleLinkInactive}
          />
        )}
        {children}
      </Flex>
    );
  }
}

export default withTranslation()<DocumentEditor>(
  inject("policies")(DocumentEditor)
);
