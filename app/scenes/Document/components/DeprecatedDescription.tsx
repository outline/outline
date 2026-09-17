import { observer } from "mobx-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled from "styled-components";
import { s } from "@shared/styles";
import { DocumentValidation } from "@shared/validations";
import type Document from "~/models/Document";
import usePolicy from "~/hooks/usePolicy";

interface Props {
  document: Document;
}

/**
 * Displays an editable reason for archiving or deleting a document.
 *
 * @param props the document to describe.
 * @returns the reason field, or plain text for readers.
 */
export const DeprecatedDescription = observer(function DeprecatedDescription({
  document,
}: Props) {
  const { t } = useTranslation();
  const can = usePolicy(document);
  const [draft, setDraft] = useState<string>();
  const value = draft ?? document.deprecatedDescription ?? "";

  const handleSave = async () => {
    if (document.isSaving || draft === undefined) {
      return;
    }

    const deprecatedDescription = draft.trim() || null;
    if (deprecatedDescription === document.deprecatedDescription) {
      setDraft(undefined);
      return;
    }

    try {
      await document.save({ deprecatedDescription });
      setDraft(undefined);
    } catch {
      toast.error(t("The reason could not be saved. Please try again."));
    }
  };

  if (!can.updateDeprecatedDescription) {
    return document.deprecatedDescription ? (
      <Description>{document.deprecatedDescription}</Description>
    ) : null;
  }

  return (
    <Input
      aria-label={t("Reason for archiving or deleting")}
      placeholder={t("Add a reason…")}
      value={value}
      rows={1}
      maxLength={DocumentValidation.maxDeprecatedDescriptionLength}
      disabled={document.isSaving}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={handleSave}
      onKeyDown={(event) => {
        if (
          event.key === "Enter" &&
          !event.shiftKey &&
          !event.nativeEvent.isComposing
        ) {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
    />
  );
});

const Description = styled.span`
  display: block;
  margin-top: 4px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
`;

const Input = styled.textarea`
  display: block;
  width: 100%;
  margin-top: 4px;
  padding: 4px 6px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: inherit;
  font: inherit;
  resize: vertical;
  field-sizing: content;

  &::placeholder {
    color: ${s("textSecondary")};
  }

  &:hover {
    border-color: ${s("inputBorder")};
  }

  &:focus-visible {
    outline: 2px solid ${s("inputBorderFocused")};
    outline-offset: 1px;
  }
`;
