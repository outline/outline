import { observer } from "mobx-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled from "styled-components";
import { DeprecationValidation } from "@shared/validations";
import type Collection from "~/models/Collection";
import type Document from "~/models/Document";
import ContentEditable from "~/components/ContentEditable";
import usePolicy from "~/hooks/usePolicy";

interface Props {
  model: Document | Collection;
}

/**
 * Displays an editable reason for archiving or deleting a document or collection.
 *
 * @param props the model to describe.
 * @returns the reason field, in read-only mode for readers.
 */
export const DeprecatedReason = observer(function DeprecatedReason({
  model,
}: Props) {
  const { t } = useTranslation();
  const can = usePolicy(model);
  const readOnly = !can.updateDeprecatedReason;
  const [draft, setDraft] = useState<string>();
  const value = draft ?? model.deprecatedReason ?? "";

  const handleSave = async () => {
    if (readOnly || model.isSaving || draft === undefined) {
      return;
    }

    const deprecatedReason = draft.trim() || null;
    if (deprecatedReason === model.deprecatedReason) {
      setDraft(undefined);
      return;
    }

    try {
      await model.save({ deprecatedReason });
      setDraft(undefined);
      toast.success(t("Reason saved"));
    } catch {
      toast.error(t("The reason could not be saved. Please try again."));
    }
  };

  if (readOnly && !model.deprecatedReason) {
    return null;
  }

  return (
    <Input
      aria-label={t("Reason for archiving or deleting")}
      placeholder={readOnly ? undefined : `${t("Add a reason")}…`}
      value={readOnly ? (model.deprecatedReason ?? "") : value}
      readOnly={readOnly}
      maxLength={DeprecationValidation.maxReasonLength}
      disabled={model.isSaving}
      onChange={setDraft}
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

const Input = styled(ContentEditable)`
  margin-top: 4px;

  > span {
    display: block;
    background: transparent;
    color: inherit;
    -webkit-text-fill-color: currentColor;
    white-space: pre-wrap;

    &[data-empty="true"] {
      display: block;
    }
  }
`;
