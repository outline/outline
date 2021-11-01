// @flow
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { MAX_TITLE_LENGTH } from "shared/constants";
import { light } from "shared/theme";
import parseTitle from "shared/utils/parseTitle";
import Document from "models/Document";
import ContentEditable from "components/ContentEditable";
import Star, { AnimatedStar } from "components/Star";
import useStores from "hooks/useStores";
import { isModKey } from "utils/keyboard";

type Props = {
  value: string,
  document: Document,
  readOnly: boolean,
  onChange: (text: string) => void,
  onGoToNextInput: (insertParagraph?: boolean) => void,
  onSave: (options: { publish?: boolean, done?: boolean }) => void,
};

function EditableTitle({
  value,
  document,
  readOnly,
  onChange,
  onSave,
  onGoToNextInput,
}: Props) {
  const ref = React.useRef();
  const { policies } = useStores();
  const { t } = useTranslation();
  const can = policies.abilities(document.id);
  const { emoji } = parseTitle(value);
  const startsWithEmojiAndSpace = !!(emoji && value.startsWith(`${emoji} `));
  const normalizedTitle =
    !value && readOnly ? document.titleWithDefault : value;

  const handleKeyDown = React.useCallback(
    (event: SyntheticKeyboardEvent<>) => {
      if (event.key === "Enter") {
        event.preventDefault();
        if (isModKey(event)) {
          onSave({ done: true });
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
        onSave({ publish: true, done: true });
        return;
      }
      if (event.key === "s" && isModKey(event)) {
        event.preventDefault();
        onSave({});
        return;
      }
    },
    [onGoToNextInput, onSave]
  );

  return (
    <Title
      ref={ref}
      onChange={onChange}
      onKeyDown={handleKeyDown}
      placeholder={
        document.isTemplate
          ? t("Start your template…")
          : t("Start with a title…")
      }
      value={normalizedTitle}
      $startsWithEmojiAndSpace={startsWithEmojiAndSpace}
      $isStarred={document.isStarred}
      autoFocus={!value}
      maxLength={MAX_TITLE_LENGTH}
      readOnly={readOnly}
      dir="auto"
    >
      {(can.star || can.unstar) && <StarButton document={document} size={32} />}
    </Title>
  );
}

const StarButton = styled(Star)`
  position: relative;
  top: 4px;
  left: 4px;
`;

const Title = styled(ContentEditable)`
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

export default observer(EditableTitle);
