// @flow
import { observable } from "mobx";
import { observer } from "mobx-react";
import * as React from "react";
import Textarea from "react-autosize-textarea";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { MAX_TITLE_LENGTH } from "shared/constants";
import parseTitle from "shared/utils/parseTitle";
import Document from "models/Document";
import ClickablePadding from "components/ClickablePadding";
import DocumentMetaWithViews from "components/DocumentMetaWithViews";
import Editor, { type Props as EditorProps } from "components/Editor";
import Flex from "components/Flex";
import HoverPreview from "components/HoverPreview";
import Star, { AnimatedStar } from "components/Star";
import { isModKey } from "utils/keyboard";
import { documentHistoryUrl } from "utils/routeHelpers";

type Props = {|
  ...EditorProps,
  onChangeTitle: (event: SyntheticInputEvent<>) => void,
  title: string,
  document: Document,
  isDraft: boolean,
  isShare: boolean,
  onSave: ({ done?: boolean, autosave?: boolean, publish?: boolean }) => any,
  innerRef: { current: any },
  children: React.Node,
|};

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
      if (isModKey(event)) {
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
    if (event.key === "p" && isModKey(event) && event.shiftKey) {
      event.preventDefault();
      this.props.onSave({ publish: true, done: true });
      return;
    }
    if (event.key === "s" && isModKey(event)) {
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
      children,
      ...rest
    } = this.props;

    const { emoji } = parseTitle(title);
    const startsWithEmojiAndSpace = !!(emoji && title.startsWith(`${emoji} `));
    const normalizedTitle =
      !title && readOnly ? document.titleWithDefault : title;

    return (
      <Flex auto column>
        {readOnly ? (
          <Title
            as="div"
            $startsWithEmojiAndSpace={startsWithEmojiAndSpace}
            $isStarred={document.isStarred}
          >
            <span>{normalizedTitle}</span>{" "}
            {!isShare && <StarButton document={document} size={32} />}
          </Title>
        ) : (
          <Title
            type="text"
            onChange={onChangeTitle}
            onKeyDown={this.handleTitleKeyDown}
            placeholder={document.placeholder}
            value={normalizedTitle}
            $startsWithEmojiAndSpace={startsWithEmojiAndSpace}
            autoFocus={!title}
            maxLength={MAX_TITLE_LENGTH}
          />
        )}
        <DocumentMetaWithViews
          isDraft={isDraft}
          document={document}
          to={documentHistoryUrl(document)}
        />
        <Editor
          ref={innerRef}
          autoFocus={!!title && !this.props.defaultValue}
          placeholder="…the rest is up to you"
          onHoverLink={this.handleLinkActive}
          scrollTo={window.location.hash}
          readOnly={readOnly}
          grow
          {...rest}
        />
        {!readOnly && <ClickablePadding onClick={this.focusAtEnd} grow />}
        {this.activeLinkEvent && !isShare && readOnly && (
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

const StarButton = styled(Star)`
  position: relative;
  top: 4px;
`;

const Title = styled(Textarea)`
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

  ${breakpoint("tablet")`
    margin-left: ${(props) => (props.$startsWithEmojiAndSpace ? "-1.2em" : 0)};
  `};

  ${AnimatedStar} {
    opacity: ${(props) => (props.$isStarred ? "1 !important" : 0)};
  }

  &:hover {
    ${AnimatedStar} {
      opacity: 0.5;

      &:hover {
        opacity: 1;
      }
    }
  }
`;

export default DocumentEditor;
