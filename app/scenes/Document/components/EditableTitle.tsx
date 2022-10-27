import { observer } from "mobx-react";
import { Selection } from "prosemirror-state";
import { SmileyIcon } from "outline-icons";
import * as React from "react";
import styled from "styled-components";
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
import Emoji from "~/components/Emoji";
import EmojiPicker from "~/components/EmojiPicker";
import NudeButton from "~/components/NudeButton";
import Star, { AnimatedStar } from "~/components/Star";
import usePickerTheme from "~/hooks/usePickerTheme";
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

const EditableTitle = React.forwardRef(
  (
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
  ) => {
    const { editor } = useDocumentContext();
    const pickerTheme = usePickerTheme();

    const handleClick = React.useCallback(() => {
      ref.current?.focus();
    }, [ref]);

    const handleKeyDown = React.useCallback(
      (event: React.KeyboardEvent) => {
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
        const [firstLine, ...rest] = text.split(`\n`);
        const content = rest.join(`\n`).trim();
        window.document.execCommand(
          "insertText",
          false,
          firstLine.replace(/^#+\s?/, "")
        );

        if (editor && content) {
          const { view, parser } = editor;
          view.dispatch(
            view.state.tr
              .setSelection(Selection.atStart(view.state.doc))
              .insert(0, parser.parse(content))
          );
        }
      },
      [editor]
    );

    const handleEmojiSelect = React.useCallback(
      async (emoji: string) => {
        if (document.emoji !== emoji) {
          await document.store.update({
            id: document.id,
            emoji,
          });
        }
      },
      [document.id, document.emoji, document.store]
    );

    const handleEmojiRemove = React.useCallback(async () => {
      if (document.emoji) {
        await document.store.update({
          id: document.id,
          emoji: null,
        });
      }
    }, [document.id, document.emoji, document.store]);

    const value =
      !document.title && readOnly ? document.titleWithDefault : document.title;

    return (
      <Title
        onClick={handleClick}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onBlur={onBlur}
        placeholder={placeholder}
        value={value}
        $isStarred={document.isStarred}
        autoFocus={!document.title}
        maxLength={DocumentValidation.maxTitleLength}
        readOnly={readOnly}
        dir="auto"
        ref={ref}
      >
        <EmojiPicker
          disclosure={
            <EmojiButton size={32} onClick={(ev) => ev.stopPropagation()}>
              {document.emoji ? (
                <Emoji size="24px" native={document.emoji} />
              ) : (
                <PlaceholderEmoji size={32} />
              )}
            </EmojiButton>
          }
          onEmojiSelect={handleEmojiSelect}
          onEmojiRemove={handleEmojiRemove}
          theme={pickerTheme}
        />
        {starrable !== false && <StarButton document={document} size={32} />}
      </Title>
    );
  }
);

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
};

const Title = styled(ContentEditable)<TitleProps>`
  position: relative;
  line-height: ${lineHeight};
  margin-top: 1em;
  margin-bottom: 0.5em;
  font-size: ${fontSize};
  font-weight: 500;
  border: 0;
  padding: 0;
  cursor: ${(props) => (props.readOnly ? "default" : "text")};

  > span {
    outline: none;
  }

  &::placeholder {
    color: ${(props) => props.theme.placeholder};
    -webkit-text-fill-color: ${(props) => props.theme.placeholder};
  }

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
    color: ${light.text};
    -webkit-text-fill-color: ${light.text};
    background: none;
  }
`;

const EmojiButton = styled(NudeButton)`
  position: absolute;
  top: 8px;
  left: -40px;
`;

const PlaceholderEmoji = styled(SmileyIcon)`
  margin-top: 2px;
`;

export default observer(EditableTitle);
