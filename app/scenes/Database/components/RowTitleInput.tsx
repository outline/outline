import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled from "styled-components";
import { s } from "@shared/styles";
import { errToString } from "@shared/utils/error";
import { DocumentValidation } from "@shared/validations";
import type Document from "~/models/Document";
import useStores from "~/hooks/useStores";

type Props = {
  /** The freshly created row whose title is being typed. */
  document: Document;
  /** Callback when the title has been committed or editing was dismissed. */
  onDone: () => void;
};

/**
 * An inline title input shown on a just-created database row so its name can
 * be typed without leaving the view. Enter or blur commits, Escape dismisses.
 */
function RowTitleInput({ document, onDone }: Props) {
  const { t } = useTranslation();
  const { documents } = useStores();
  const [value, setValue] = React.useState(document.title);
  const isSubmittingRef = React.useRef(false);

  const handleCommit = React.useCallback(async () => {
    if (isSubmittingRef.current) {
      return;
    }
    isSubmittingRef.current = true;
    const title = value.trim();
    try {
      if (title && title !== document.title) {
        await documents.update({ id: document.id, title });
      }
    } catch (error) {
      toast.error(errToString(error));
    } finally {
      isSubmittingRef.current = false;
      onDone();
    }
  }, [documents, document, value, onDone]);

  const handleKeyDown = React.useCallback(
    (ev: React.KeyboardEvent<HTMLInputElement>) => {
      if (ev.nativeEvent.isComposing) {
        return;
      }
      if (ev.key === "Enter") {
        ev.preventDefault();
        void handleCommit();
      }
      if (ev.key === "Escape") {
        ev.preventDefault();
        onDone();
      }
    },
    [handleCommit, onDone]
  );

  return (
    <Input
      type="text"
      value={value}
      placeholder={t("Untitled")}
      maxLength={DocumentValidation.maxTitleLength}
      onChange={(ev) => setValue(ev.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={() => void handleCommit()}
      onClick={(ev) => ev.stopPropagation()}
      autoFocus
    />
  );
}

const Input = styled.input`
  border: 0;
  outline: none;
  background: ${s("backgroundSecondary")};
  color: ${s("text")};
  font-size: 14px;
  font-weight: 500;
  width: 100%;
  padding: 2px 4px;
  border-radius: 4px;

  &::placeholder {
    color: ${s("placeholder")};
  }
`;

export default observer(RowTitleInput);
