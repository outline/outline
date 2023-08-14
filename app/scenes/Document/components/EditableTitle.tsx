import { observer } from "mobx-react";
import { Slice } from "prosemirror-model";
import { Selection } from "prosemirror-state";
import { __parseFromClipboard } from "prosemirror-view";
import * as React from "react";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import isMarkdown from "@shared/editor/lib/isMarkdown";
import normalizePastedMarkdown from "@shared/editor/lib/markdown/normalize";
import { s } from "@shared/styles";
import { light } from "@shared/styles/theme";
import {
  getCurrentDateAsString,
  getCurrentDateTimeAsString,
  getCurrentTimeAsString,
} from "@shared/utils/date";
import { DocumentValidation } from "@shared/validations";
import Document from "~/models/Document";
import ContentEditable, { RefHandle } from "~/components/ContentEditable";
import { useDocumentContext } from "~/components/DocumentContext";
import EmojiPicker, {
  AnimatedEmoji,
  EmojiWrapper,
  Emoji,
} from "~/components/EmojiPicker";
import Star, { AnimatedStar } from "~/components/Star";
import usePolicy from "~/hooks/usePolicy";
import { isModKey } from "~/utils/keyboard";

type Props = {
  document: Document;
  /** Placeholder to display when the document has no title */
  placeholder: string;
  /** Should the title be editable, policies will also be considered separately */
  readOnly?: boolean;
  /** Whether the title show the option to star, policies will also be considered separately (defaults to true) */
  starrable?: boolean;
  /** Callback called on any edits to text */
  onChange: (text: string) => void;
  /** Callback called when the user expects to move to the "next" input */
  onGoToNextInput: (insertParagraph?: boolean) => void;
  /** Callback called when the user expects to save (CMD+S) */
  onSave?: (options: { publish?: boolean; done?: boolean }) => void;
  /** Callback called when focus leaves the input */
  onBlur?: React.FocusEventHandler<HTMLSpanElement>;
};

const lineHeight = "1.25";
const fontSize = "2.25em";

const EditableTitle = React.forwardRef(function _EditableTitle(
  {
    document,
    readOnly,
    onChange,
    onSave,
    onGoToNextInput,
    onBlur,
    starrable,
    placeholder,
  }: Props,
  ref: React.RefObject<RefHandle>
) {
  const [isFocused, setFocus] = React.useState(false);
  const { editor } = useDocumentContext();

  const can = usePolicy(document.id);

  const handleClick = React.useCallback(() => {
    ref.current?.focus();
  }, [ref]);

  const handleBlur = React.useCallback(
    (ev: React.FocusEvent<HTMLSpanElement>) => {
      // Do nothing and simply return if the related target is the parent
      // or a sibling of the current target element(the <span>
      // containing document title)
      if (
        ev.currentTarget.parentElement === ev.relatedTarget ||
        (ev.relatedTarget &&
          ev.currentTarget.parentElement === ev.relatedTarget.parentElement)
      ) {
        return;
      }
      if (onBlur) {
        onBlur(ev);
      }
      setFocus(false);
    },
    [onBlur]
  );

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent) => {
      if (event.nativeEvent.isComposing) {
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();

        if (isModKey(event)) {
          onSave?.({
            done: true,
          });
          return;
        }

        onGoToNextInput(true);
        return;
      }

      if (event.key === "Tab" || event.key === "ArrowDown") {
        event.preventDefault();
        onGoToNextInput();
        return;
      }

      if (event.key === "p" && isModKey(event) && event.shiftKey) {
        event.preventDefault();
        onSave?.({
          publish: true,
          done: true,
        });
        return;
      }

      if (event.key === "s" && isModKey(event)) {
        event.preventDefault();
        onSave?.({});
        return;
      }
    },
    [onGoToNextInput, onSave]
  );

  const handleChange = React.useCallback(
    (text: string) => {
      if (/\/date\s$/.test(text)) {
        onChange(getCurrentDateAsString());
        ref.current?.focusAtEnd();
      } else if (/\/time$/.test(text)) {
        onChange(getCurrentTimeAsString());
        ref.current?.focusAtEnd();
      } else if (/\/datetime$/.test(text)) {
        onChange(getCurrentDateTimeAsString());
        ref.current?.focusAtEnd();
      } else {
        onChange(text);
      }
    },
    [ref, onChange]
  );

  // Custom paste handling so that if a multiple lines are pasted we
  // only take the first line and insert the rest directly into the editor.
  const handlePaste = React.useCallback(
    (event: React.ClipboardEvent) => {
      event.preventDefault();

      const text = event.clipboardData.getData("text/plain");
      const html = event.clipboardData.getData("text/html");
      const [firstLine, ...rest] = text.split(`\n`);
      const content = rest.join(`\n`).trim();

      window.document.execCommand(
        "insertText",
        false,
        firstLine.replace(/^#+\s?/, "")
      );

      if (editor && content) {
        const { view, pasteParser } = editor;
        let slice;

        if (isMarkdown(text)) {
          const paste = pasteParser.parse(normalizePastedMarkdown(content));
          if (paste) {
            slice = paste.slice(0);
          }
        } else {
          const defaultSlice = __parseFromClipboard(
            view,
            text,
            html,
            false,
            view.state.selection.$from
          );

          // remove first node from slice
          slice = defaultSlice.content.firstChild
            ? new Slice(
                defaultSlice.content.cut(
                  defaultSlice.content.firstChild.nodeSize
                ),
                defaultSlice.openStart,
                defaultSlice.openEnd
              )
            : defaultSlice;
        }

        if (slice) {
          view.dispatch(
            view.state.tr
              .setSelection(Selection.atStart(view.state.doc))
              .replaceSelection(slice)
          );
        }
      }
    },
    [editor]
  );

  const handleEmojiChange = React.useCallback(
    async (emoji: string | null) => {
      // Restore focus on title
      ref.current?.focus();
      if (document.emoji !== emoji) {
        document.emoji = emoji;
        await document.save();
      }
    },
    [document, ref]
  );

  const handleFocus = React.useCallback(() => {
    setFocus(true);
  }, [setFocus]);

  const value =
    !document.title && readOnly ? document.titleWithDefault : document.title;

  return (
    <Title
      onClick={handleClick}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      value={value}
      $isStarred={document.isStarred}
      $isFocused={isFocused}
      $containsEmoji={!!document.emoji}
      autoFocus={!document.title}
      maxLength={DocumentValidation.maxTitleLength}
      readOnly={readOnly}
      dir="auto"
      ref={ref}
    >
      {can.update ? (
        <EmojiPicker
          value={document.emoji}
          onChange={handleEmojiChange}
          // Restore focus on title
          onClickOutside={handleClick}
        />
      ) : document.emoji ? (
        <EmojiWrapper align="center" justify="center">
          <Emoji size={24}>{document.emoji}</Emoji>
        </EmojiWrapper>
      ) : null}

      {starrable !== false && <StarButton document={document} size={32} />}
    </Title>
  );
});

const StarButton = styled(Star)`
  position: relative;
  top: 4px;
  left: 10px;
  overflow: hidden;
  width: 24px;

  svg {
    position: relative;
    left: -4px;
  }
`;

type TitleProps = {
  $isStarred: boolean;
  $containsEmoji: boolean;
  $isFocused: boolean;
};

const Title = styled(ContentEditable)<TitleProps>`
  position: relative;
  line-height: ${lineHeight};
  margin-top: 1em;
  margin-bottom: 0.5em;
  margin-left: ${(props) =>
    props.$containsEmoji || props.$isFocused ? "35px" : "0px"};
  font-size: ${fontSize};
  font-weight: 500;
  border: 0;
  padding: 0;
  cursor: ${(props) => (props.readOnly ? "default" : "text")};

  > span {
    outline: none;
  }

  &::placeholder {
    color: ${s("placeholder")};
    -webkit-text-fill-color: ${s("placeholder")};
  }

  ${AnimatedStar} {
    opacity: ${(props) => (props.$isStarred ? "1 !important" : 0.5)};
  }

  ${AnimatedEmoji} {
    opacity: ${(props) => (props.$containsEmoji ? "1 !important" : 0.5)};
    display: ${(props: TitleProps) =>
      props.$isFocused || props.$containsEmoji ? "flex" : "none"};
  }

  ${breakpoint("tablet")`
    margin-left: 0px;

    ${AnimatedStar} {
      opacity: ${(props: TitleProps) =>
        props.$isStarred ? "1 !important" : 0};
    }

    ${AnimatedEmoji} {
      opacity: ${(props: TitleProps) =>
        props.$containsEmoji ? "1 !important" : 0};
      display: flex;
    }

    &:hover {
      ${AnimatedStar} {
        opacity: 0.5;

        &:hover {
          opacity: 1;
        }
      }

      ${AnimatedEmoji} {
        opacity: 0.5;

        &:hover {
          opacity: 1;
        }
      }
    }`};

  @media print {
    color: ${light.text};
    -webkit-text-fill-color: ${light.text};
    background: none;
  }
`;

export default observer(EditableTitle);
