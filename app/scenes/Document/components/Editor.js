// @flow
import { observable } from "mobx";
import { observer } from "mobx-react";
import * as React from "react";
import Textarea from "react-autosize-textarea";
import styled from "styled-components";
import { MAX_TITLE_LENGTH } from "shared/constants";
import parseTitle from "shared/utils/parseTitle";
import Document from "models/Document";
import ClickablePadding from "components/ClickablePadding";
import DocumentMetaWithViews from "components/DocumentMetaWithViews";
import Editor from "components/Editor";
import Flex from "components/Flex";
import HoverPreview from "components/HoverPreview";
import { documentHistoryUrl } from "utils/routeHelpers";

type Props = {
  onChangeTitle: (event: SyntheticInputEvent<>) => void,
  title: string,
  defaultValue: string,
  document: Document,
  isDraft: boolean,
  isShare: boolean,
  readOnly?: boolean,
  onSave: ({ publish?: boolean, done?: boolean, autosave?: boolean }) => mixed,
  innerRef: { current: any },
};

@observer
class DocumentEditor extends React.Component<Props> {
  @observable activeLinkEvent: ?MouseEvent;

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

  handleTitleKeyDown = (event: SyntheticKeyboardEvent<>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (event.metaKey) {
        this.props.onSave({ done: true });
        return;
      }

      this.insertParagraph();
      this.focusAtStart();
      return;
    }
    if (event.key === "Tab" || event.key === "ArrowDown") {
      event.preventDefault();
      this.focusAtStart();
      return;
    }
    if (event.key === "p" && event.metaKey && event.shiftKey) {
      event.preventDefault();
      this.props.onSave({ publish: true, done: true });
      return;
    }
    if (event.key === "s" && event.metaKey) {
      event.preventDefault();
      this.props.onSave({});
      return;
    }
  };

  handleLinkActive = (event: MouseEvent) => {
    this.activeLinkEvent = event;
  };

  handleLinkInactive = () => {
    this.activeLinkEvent = null;
  };

  render() {
    const {
      document,
      title,
      onChangeTitle,
      isDraft,
      isShare,
      readOnly,
      innerRef,
    } = this.props;
    const { emoji } = parseTitle(title);
    const startsWithEmojiAndSpace = !!(emoji && title.startsWith(`${emoji} `));

    return (
      <Flex auto column>
        <Title
          type="text"
          onChange={onChangeTitle}
          onKeyDown={this.handleTitleKeyDown}
          placeholder={document.placeholder}
          value={!title && readOnly ? document.titleWithDefault : title}
          style={startsWithEmojiAndSpace ? { marginLeft: "-1.2em" } : undefined}
          readOnly={readOnly}
          disabled={readOnly}
          autoFocus={!title}
          maxLength={MAX_TITLE_LENGTH}
        />
        <DocumentMetaWithViews
          isDraft={isDraft}
          document={document}
          to={documentHistoryUrl(document)}
        />
        <Editor
          ref={innerRef}
          autoFocus={title && !this.props.defaultValue}
          placeholder="…the rest is up to you"
          onHoverLink={this.handleLinkActive}
          scrollTo={window.location.hash}
          grow
          {...this.props}
        />
        {!readOnly && <ClickablePadding onClick={this.focusAtEnd} grow />}
        {this.activeLinkEvent && !isShare && readOnly && (
          <HoverPreview
            node={this.activeLinkEvent.target}
            event={this.activeLinkEvent}
            onClose={this.handleLinkInactive}
          />
        )}
      </Flex>
    );
  }
}

const Title = styled(Textarea)`
  z-index: 1;
  line-height: 1.25;
  margin-top: 1em;
  margin-bottom: 0.5em;
  background: ${(props) => props.theme.background};
  transition: ${(props) => props.theme.backgroundTransition};
  color: ${(props) => props.theme.text};
  -webkit-text-fill-color: ${(props) => props.theme.text};
  font-size: 2.25em;
  font-weight: 500;
  outline: none;
  border: 0;
  padding: 0;
  resize: none;

  &::placeholder {
    color: ${(props) => props.theme.placeholder};
    -webkit-text-fill-color: ${(props) => props.theme.placeholder};
  }
`;

export default DocumentEditor;
