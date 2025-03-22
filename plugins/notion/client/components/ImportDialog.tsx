import React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ImportInput } from "@shared/schema";
import { CollectionPermission, IntegrationService } from "@shared/types";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import InputSelectPermission from "~/components/InputSelectPermission";
import Text from "~/components/Text";
import useBoolean from "~/hooks/useBoolean";
import useStores from "~/hooks/useStores";
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

  const handlePermissionChange = React.useCallback(
    (value: CollectionPermission | typeof EmptySelectValue) => {
      setPermission(value === EmptySelectValue ? undefined : value);
    },
    []
  );

  const handleStartImport = React.useCallback(async () => {
    setSubmitting();

    // TODO: This can send the page info + permission once we overcome the search timeout issues.
    const input: ImportInput<IntegrationService.Notion> = [{ permission }];

    try {
      await imports.create(
        { service: IntegrationService.Notion },
        { integrationId, input }
      );

      toast.success(
        t("Your import is being processed, you can safely leave this page")
      );

      onSubmit();
    } catch (err) {
      toast.error(err.message);
      resetSubmitting();
    }
  }, [permission, onSubmit]);

  return (
    <Flex column gap={12}>
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
      <Flex justify="flex-end">
        <Button onClick={handleStartImport} disabled={submitting}>
          {t("Start import")}
        </Button>
      </Flex>
    </Flex>
  );
}
