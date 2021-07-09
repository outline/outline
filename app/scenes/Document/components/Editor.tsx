import { observable } from "mobx";
import { observer } from "mobx-react";
import * as React from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import Textarea from "react-autosize-textarea";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { MAX_TITLE_LENGTH } from "shared/constants";
import { light } from "shared/styles/theme";
import parseTitle from "shared/utils/parseTitle";
import Document from "models/Document";
import ClickablePadding from "components/ClickablePadding";
import DocumentMetaWithViews from "components/DocumentMetaWithViews";
import Editor from "components/Editor";
import type { Props as EditorProps } from "components/Editor";
import Flex from "components/Flex";
import HoverPreview from "components/HoverPreview";
import Star, { AnimatedStar } from "components/Star";
import { isModKey } from "utils/keyboard";
import { documentHistoryUrl } from "utils/routeHelpers";

type Props = {
  onChangeTitle: (event: ChangeEvent) => void;
  title: string;
  document: Document;
  isDraft: boolean;
  shareId: string | undefined | null;
  onSave: (a: { done?: boolean; autosave?: boolean; publish?: boolean }) => any;
  innerRef: {
    current: any;
  };
  children: React.ReactNode;
} & EditorProps;

@observer
class DocumentEditor extends React.Component<Props> {
  @observable activeLinkEvent: MouseEvent | undefined | null;
  @observable ref = React.createRef<
    HTMLDivElement | HTMLTextAreaElement | HTMLInputElement
  >();

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

  handleTitleKeyDown = (event: KeyboardEvent) => {
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
      shareId,
      readOnly,
      innerRef,
      children,
      ...rest
    } = this.props;

    const { emoji } = parseTitle(title);
    const startsWithEmojiAndSpace = !!(emoji && title.startsWith(`${emoji} `));
    const normalizedTitle =
      !title && readOnly ? document.titleWithDefault : title;

    console.log(this.ref.current);

    return (
      <Flex auto column>
        {readOnly ? (
          <Title
            as="div"
            ref={this.ref}
            $startsWithEmojiAndSpace={startsWithEmojiAndSpace}
            $isStarred={document.isStarred}
            dir="auto"
          >
            <span>{normalizedTitle}</span>{" "}
            {!shareId && <StarButton document={document} size={32} />}
          </Title>
        ) : (
          <Title
            type="text"
            ref={this.ref}
            onChange={onChangeTitle}
            onKeyDown={this.handleTitleKeyDown}
            placeholder={document.placeholder}
            value={normalizedTitle}
            $startsWithEmojiAndSpace={startsWithEmojiAndSpace}
            autoFocus={!title}
            maxLength={MAX_TITLE_LENGTH}
            dir="auto"
          />
        )}
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
        <Editor
          ref={innerRef}
          autoFocus={!!title && !this.props.defaultValue}
          placeholder="…the rest is up to you"
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

  @media print {
    color: ${(props) => light.text};
    -webkit-text-fill-color: ${(props) => light.text};
    background: none;
  }
`;

export default DocumentEditor;
