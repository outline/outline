import React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { errToString } from "@shared/utils/error";
import type { ImportInput } from "@shared/schema";
import type { CollectionPermission } from "@shared/types";
import { IntegrationService } from "@shared/types";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import { InputSelectPermission } from "~/components/InputSelectPermission";
import Text from "~/components/Text";
import useBoolean from "~/hooks/useBoolean";
import useStores from "~/hooks/useStores";
import type { ImportDestination } from "~/scenes/Settings/components/ImportRootPicker";
import ImportRootPicker from "~/scenes/Settings/components/ImportRootPicker";
import { EmptySelectValue } from "~/types";

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
  const [permission, setPermission] = React.useState<CollectionPermission>();
  const [destination, setDestination] =
    React.useState<ImportDestination | null>(null);

  const handlePermissionChange = React.useCallback(
    (value: CollectionPermission | typeof EmptySelectValue) => {
      setPermission(value === EmptySelectValue ? undefined : value);
    },
    []
  );

  const handleStartImport = React.useCallback(async () => {
    setSubmitting();

    // Root pages are fetched on the server to avoid Notion search timeouts.
    // Permission only applies to created collections, so it is omitted when
    // importing into an existing destination.
    const input: ImportInput<IntegrationService.Notion> = [
      { permission: destination ? undefined : permission },
    ];

    try {
      await imports.create(
        { service: IntegrationService.Notion },
        { integrationId, input, ...destination }
      );

      toast.success(
        t("Your import is being processed, you can safely leave this page")
      );

      onSubmit();
    } catch (err) {
      toast.error(errToString(err));
      resetSubmitting();
    }
  }, [
    permission,
    destination,
    onSubmit,
    integrationId,
    t,
    imports,
    resetSubmitting,
    setSubmitting,
  ]);

  return (
    <Flex column gap={12}>
      <ImportRootPicker onChange={setDestination} />
      {!destination && (
        <div>
          <InputSelectPermission
            value={permission}
            onChange={handlePermissionChange}
          />
          <Text as="span" type="secondary">
            {t(
              "Set the default permission level for collections created from the import"
            )}
            .
          </Text>
        </div>
      )}
      <Flex justify="flex-end">
        <Button onClick={handleStartImport} disabled={submitting}>
          {submitting ? t("Uploading") + "…" : t("Start import")}
        </Button>
      </Flex>
    </Flex>
  );
}
