// @flow
import * as React from "react";
import styled from "styled-components";
import Textarea from "react-autosize-textarea";
import { observable } from "mobx";
import { observer } from "mobx-react";
import Editor from "components/Editor";
import ClickablePadding from "components/ClickablePadding";
import Flex from "components/Flex";
import HoverPreview from "components/HoverPreview";
import parseTitle from "shared/utils/parseTitle";
import Document from "models/Document";
import DocumentMeta from "components/DocumentMeta";

type Props = {
  onChangeTitle: (event: SyntheticInputEvent<>) => void,
  title: string,
  defaultValue: string,
  document: Document,
  isDraft: boolean,
  isShare: boolean,
  readOnly?: boolean,
};

@observer
class DocumentEditor extends React.Component<Props> {
  @observable activeLinkEvent: ?MouseEvent;
  editor: ?Editor;

  focusAtStart = () => {
    if (this.editor) {
      this.editor.focusAtStart();
    }
  };

  focusAtEnd = () => {
    if (this.editor) {
      this.editor.focusAtEnd();
    }
  };

  getHeadings = () => {
    if (this.editor) {
      return this.editor.getHeadings();
    }

    return [];
  };

  handleTitleKeyDown = (event: SyntheticKeyboardEvent<>) => {
    if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      this.focusAtStart();
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
    } = this.props;
    const { emoji } = parseTitle(title);
    const startsWithEmojiAndSpace = !!(emoji && title.startsWith(`${emoji} `));

    return (
      <Flex auto column>
        <Title
          type="text"
          onChange={onChangeTitle}
          onKeyDown={this.handleTitleKeyDown}
          placeholder="Start with a title…"
          value={!title && readOnly ? "Untitled" : title}
          style={startsWithEmojiAndSpace ? { marginLeft: "-1.2em" } : undefined}
          readOnly={readOnly}
          autoFocus={!title}
          maxLength={100}
        />
        <DocumentMeta isDraft={isDraft} document={document} />
        <Editor
          ref={ref => (this.editor = ref)}
          autoFocus={title && !this.props.defaultValue}
          placeholder="…the rest is up to you"
          onHoverLink={this.handleLinkActive}
          scrollTo={window.location.hash}
          grow
          {...this.props}
        />
        {!readOnly && <ClickablePadding onClick={this.focusAtEnd} grow />}
        {this.activeLinkEvent &&
          !isShare &&
          readOnly && (
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
  text: ${props => props.theme.text};
  background: ${props => props.theme.background};
  transition: ${props => props.theme.backgroundTransition};
  color: ${props => props.theme.text};
  font-size: 2.25em;
  font-weight: 500;
  outline: none;
  border: 0;
  padding: 0;
  resize: none;

  &::placeholder {
    color: ${props => props.theme.placeholder};
  }
`;

export default DocumentEditor;
