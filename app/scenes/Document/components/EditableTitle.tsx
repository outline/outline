import { observer } from "mobx-react";
import * as React from "react";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { MAX_TITLE_LENGTH } from "@shared/constants";
import { light } from "@shared/styles/theme";
import {
  getCurrentDateAsString,
  getCurrentDateTimeAsString,
  getCurrentTimeAsString,
} from "@shared/utils/date";
import Document from "~/models/Document";
import ContentEditable, { RefHandle } from "~/components/ContentEditable";
import Star, { AnimatedStar } from "~/components/Star";
import useEmojiWidth from "~/hooks/useEmojiWidth";
import { isModKey } from "~/utils/keyboard";

type Props = {
  value: string;
  placeholder: string;
  document: Document;
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
      value,
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
    const normalizedTitle =
      !value && readOnly ? document.titleWithDefault : value;

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

    const emojiWidth = useEmojiWidth(document.emoji, {
      fontSize,
      lineHeight,
    });

    return (
      <Title
        onClick={handleClick}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={onBlur}
        placeholder={placeholder}
        value={normalizedTitle}
        $emojiWidth={emojiWidth}
        $isStarred={document.isStarred}
        autoFocus={!value}
        maxLength={MAX_TITLE_LENGTH}
        readOnly={readOnly}
        dir="auto"
        ref={ref}
      >
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
  $emojiWidth: number;
};

const Title = styled(ContentEditable)<TitleProps>`
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

  ${breakpoint("tablet")`
    margin-left: ${(props: TitleProps) => -props.$emojiWidth}px;
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
    color: ${light.text};
    -webkit-text-fill-color: ${light.text};
    background: none;
  }
`;

export default observer(EditableTitle);
