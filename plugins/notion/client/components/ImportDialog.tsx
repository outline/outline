import React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { errToString } from "@shared/utils/error";
import type { ImportInput } from "@shared/schema";
import { IntegrationService } from "@shared/types";
import useBoolean from "~/hooks/useBoolean";
import useStores from "~/hooks/useStores";
import type { ImportOptions } from "~/scenes/Settings/components/ImportSteps";
import { ImportSteps } from "~/scenes/Settings/components/ImportSteps";

type Props = {
  /** The integrationId associated with this import flow. */
  integrationId: string;
  /** Callback to handle import creation. */
  onSubmit: () => void;
};

export function ImportDialog({ integrationId, onSubmit }: Props) {
  const { t } = useTranslation();
  const { imports } = useStores();
  const [submitting, setSubmitting, resetSubmitting] = useBoolean();

  const handleStartImport = React.useCallback(
    async ({ destination, permission }: ImportOptions) => {
      setSubmitting();

      // Root pages are fetched on the server to avoid Notion search timeouts.
      const input: ImportInput<IntegrationService.Notion> = [{ permission }];

      try {
        await imports.create(
          { service: IntegrationService.Notion },
          { integrationId, input, ...destination }
        );

        toast.success(
          t("Your import is being processed – you can safely leave this page")
        );

        onSubmit();
      } catch (err) {
        toast.error(errToString(err));
        resetSubmitting();
      }
    },
    [onSubmit, integrationId, t, imports, resetSubmitting, setSubmitting]
  );

  return (
    <ImportSteps
      isSubmitting={submitting}
      submittingLabel={t("Uploading") + "…"}
      onStart={handleStartImport}
    />
  );
}
