import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Text from "~/components/Text";
import useStores from "~/hooks/useStores";

type Props = {
  /** Callback when the dialog is submitted. Return false to prevent closing. */
  onSubmit: () => Promise<void | boolean> | void;
  /** Text to display on the submit button */
  submitText?: string;
  /** Text to display while the form is saving */
  savingText?: string;
  /** If true, the submit button will be a dangerous red */
  danger?: boolean;
  /** Keep the submit button disabled */
  disabled?: boolean;
  children?: React.ReactNode;
};

const ConfirmationDialog: React.FC<Props> = ({
  onSubmit,
  children,
  submitText,
  savingText,
  danger,
  disabled = false,
}: Props) => {
  const [isSaving, setIsSaving] = React.useState(false);
  const { t } = useTranslation();
  const { dialogs } = useStores();

  const handleSubmit = React.useCallback(
    async (ev: React.SyntheticEvent) => {
      ev.preventDefault();
      setIsSaving(true);
      try {
        const res = await onSubmit();
        if (res === false) {
          return;
        }
        dialogs.closeAllModals();
      } catch (err) {
        toast.error(err.message);
      } finally {
        setIsSaving(false);
      }
    },
    [onSubmit, dialogs]
  );

  return (
    <form onSubmit={handleSubmit}>
      <Flex gap={12} column>
        <Text type="secondary">{children}</Text>

        <Flex justify="flex-end">
          <Button
            type="submit"
            disabled={isSaving || disabled}
            danger={danger}
            autoFocus
          >
            {isSaving && savingText ? savingText : submitText ?? t("Confirm")}
          </Button>
        </Flex>
      </Flex>
    </form>
  );
};

export default observer(ConfirmationDialog);
