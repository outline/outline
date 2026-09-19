import { useState } from "react";
import { useTranslation } from "react-i18next";
import { DeprecationValidation } from "@shared/validations";
import ConfirmationDialog from "~/components/ConfirmationDialog";
import Flex from "~/components/Flex";
import Input from "~/components/Input";

interface Props {
  count: number;
  onSubmit: (reason?: string) => Promise<void>;
}

/**
 * Confirms document archival with an optional reason.
 *
 * @param props the document count and archive callback.
 * @returns the archive confirmation form.
 */
export function DocumentArchiveDialog({ count, onSubmit }: Props) {
  const { t } = useTranslation();
  const [reason, setReason] = useState("");

  const handleSubmit = () => onSubmit(reason.trim() || undefined);

  return (
    <ConfirmationDialog
      onSubmit={handleSubmit}
      submitText={t("Archive")}
      savingText={`${t("Archiving")}…`}
    >
      <Flex column gap={12}>
        <div>
          {count === 1
            ? t(
                "Archiving this document will remove it from the collection and search results."
              )
            : t(
                "Archiving these documents will remove them from their collections and search results."
              )}
        </div>
        <Input
          name="reason"
          label={t("Reason (optional)")}
          placeholder={`${t("Add a reason")}…`}
          value={reason}
          onChange={(event) => setReason(event.currentTarget.value)}
          maxLength={DeprecationValidation.maxReasonLength}
          margin={0}
        />
      </Flex>
    </ConfirmationDialog>
  );
}
