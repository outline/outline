import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { MAX_TITLE_LENGTH } from "@shared/constants";
import { light } from "@shared/theme";
import Document from "~/models/Document";
import ContentEditable from "~/components/ContentEditable";
import { AnimatedStar } from "~/components/Star";
import { isModKey } from "~/utils/keyboard";

type Props = {
  value: string;
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
};

const lineHeight = "1.25";
const fontSize = "2.25em";

const EditableTitle = React.forwardRef(
  (
    { value, document, readOnly, onChange, onSave, onGoToNextInput }: Props,
    ref: React.RefObject<HTMLSpanElement>
  ) => {
    const { t } = useTranslation();
    const normalizedTitle =
      !value && readOnly ? document.titleWithDefault : value;

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

    /**
     * Measures the width of the document's emoji in the title
     */
    const emojiWidth = React.useMemo(() => {
      const element = window.document.createElement("span");
      if (!document.emoji) {
        return 0;
      }

      element.innerText = `${document.emoji}\u00A0`;
      element.style.visibility = "hidden";
      element.style.position = "absolute";
      element.style.left = "-9999px";
      element.style.lineHeight = lineHeight;
      element.style.fontSize = fontSize;
      element.style.width = "max-content";
      window.document.body?.appendChild(element);
      const width = window.getComputedStyle(element).width;
      window.document.body?.removeChild(element);
      return parseInt(width, 10);
    }, [document.emoji]);

    return (
      <Title
        onChange={onChange}
        onKeyDown={handleKeyDown}
        placeholder={
          document.isTemplate
            ? t("Start your template…")
            : t("Start with a title…")
        }
        value={normalizedTitle}
        $emojiWidth={emojiWidth}
        $isStarred={document.isStarred}
        autoFocus={!value}
        maxLength={MAX_TITLE_LENGTH}
        readOnly={readOnly}
        dir="auto"
        ref={ref}
      />
    );
  }
);

type TitleProps = {
  $isStarred: boolean;
  $emojiWidth: number;
};

const Title = styled(ContentEditable)<TitleProps>`
  line-height: ${lineHeight};
  margin-top: 1em;
  margin-bottom: 0.5em;
  background: ${(props) => props.theme.background};
  transition: ${(props) => props.theme.backgroundTransition};
  color: ${(props) => props.theme.text};
  -webkit-text-fill-color: ${(props) => props.theme.text};
  font-size: ${fontSize};
  font-weight: 500;
  outline: none;
  border: 0;
  padding: 0;
  resize: none;

  > span {
    outline: none;
    display: block;
    padding-bottom: 10px;
    margin-bottom: 5px;
    border-bottom: 1px solid ${(props) => props.theme.smokeDark};
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
