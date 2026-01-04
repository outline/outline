import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Input from "~/components/Input";
import Text from "~/components/Text";
import { client } from "~/utils/ApiClient";

interface RenamePasskeyDialogProps {
  passkeyId: string;
  currentName: string | null;
  onSuccess: () => void;
}

/**
 * Dialog component for renaming a passkey.
 *
 * @param passkeyId - the ID of the passkey to rename.
 * @param currentName - the current name of the passkey.
 * @param onSuccess - callback to be called after successful rename.
 * @returns dialog component for renaming passkeys.
 */
function RenamePasskeyDialog({
  passkeyId,
  currentName,
  onSuccess,
}: RenamePasskeyDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = React.useState(currentName || "");
  const [isSaving, setIsSaving] = React.useState(false);

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();

    setIsSaving(true);
    try {
      await client.post("/passkeys.update", {
        id: passkeyId,
        name: name.trim(),
      });
      toast.success(t("Passkey updated"));
      onSuccess();
    } catch (err) {
      toast.error(
        err.message || t("Failed to update passkey. Please try again.")
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Text as="p" type="secondary">
        {t("Give your passkey a memorable name to easily identify it.")}
      </Text>
      <Input
        type="text"
        value={name}
        onChange={(ev) => setName(ev.target.value)}
        placeholder={t("Enter passkey name")}
        autoFocus
        required
        maxLength={255}
        disabled={isSaving}
      />
      <Flex justify="flex-end" gap={8}>
        <Button type="submit" disabled={isSaving || !name.trim()}>
          {t("Save")}
        </Button>
      </Flex>
    </form>
  );
}

export default observer(RenamePasskeyDialog);
