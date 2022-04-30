import { observer } from "mobx-react";
import * as React from "react";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Text from "~/components/Text";
import useStores from "~/hooks/useStores";
import useToasts from "~/hooks/useToasts";

type Props = {
  onSubmit: () => void;
  children: JSX.Element;
  submitText?: string;
  savingText?: string;
  danger?: boolean;
};

function ConfirmationDialog({
  onSubmit,
  children,
  submitText,
  savingText,
  danger,
}: Props) {
  const [isSaving, setIsSaving] = React.useState(false);
  const { dialogs } = useStores();
  const { showToast } = useToasts();

  const handleSubmit = React.useCallback(
    async (ev: React.SyntheticEvent) => {
      ev.preventDefault();
      setIsSaving(true);
      try {
        await onSubmit();
        dialogs.closeAllModals();
      } catch (err) {
        showToast(err.message, {
          type: "error",
        });
      } finally {
        setIsSaving(false);
      }
    },
    [onSubmit, dialogs, showToast]
  );

  return (
    <Flex column>
      <form onSubmit={handleSubmit}>
        <Text type="secondary">{children}</Text>
        <Button type="submit" disabled={isSaving} danger={danger} autoFocus>
          {isSaving ? savingText : submitText}
        </Button>
      </form>
    </Flex>
  );
}

export default observer(ConfirmationDialog);
