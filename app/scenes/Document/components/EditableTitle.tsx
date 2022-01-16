import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Portal } from "react-portal";
import { VisuallyHidden } from "reakit/VisuallyHidden";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { MAX_TITLE_LENGTH } from "@shared/constants";
import { light } from "@shared/theme";
import parseTitle from "@shared/utils/parseTitle";
import Document from "~/models/Document";
import ContentEditable from "~/components/ContentEditable";
import Star, { AnimatedStar } from "~/components/Star";
import useDimensions from "~/hooks/useDimensions";
import useStores from "~/hooks/useStores";
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

const EditableTitle = React.forwardRef(
  (
    {
      value,
      document,
      readOnly,
      onChange,
      onSave,
      onGoToNextInput,
      starrable,
    }: Props,
    ref: React.RefObject<HTMLSpanElement>
  ) => {
    const { policies } = useStores();
    const { t } = useTranslation();
    const can = policies.abilities(document.id);
    const { emoji } = parseTitle(value);
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

    const [measureRef, dimensions] = useDimensions([value]);
    const emojiWidth = dimensions.width;

    return (
      <>
        <Portal>
          <VisuallyHidden>
            <MeasureEmoji ref={measureRef}>
              {emoji ? <>{emoji}&nbsp;</> : undefined}
            </MeasureEmoji>
          </VisuallyHidden>
        </Portal>
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
        >
          {(can.star || can.unstar) && starrable !== false && (
            <StarButton document={document} size={32} />
          )}
        </Title>
      </>
    );
  }
);

const MeasureEmoji = styled.span`
  line-height: 1.25;
  font-size: 2.25em;
`;

const StarButton = styled(Star)`
  position: relative;
  top: 4px;
  left: 4px;
`;

type TitleProps = {
  $isStarred: boolean;
  $emojiWidth: number;
};

const Title = styled(ContentEditable)<TitleProps>`
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
