import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Input from "~/components/Input";
import Text from "~/components/Text";
import useStores from "~/hooks/useStores";
import useToasts from "~/hooks/useToasts";

type Props = {
  onSubmit: () => void;
};

function WebhookSubscriptionNew({ onSubmit }: Props) {
  const [name, setName] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);
  const { webhookSubscriptions } = useStores();
  const { showToast } = useToasts();
  const { t } = useTranslation();

  const handleSubmit = React.useCallback(
    async (ev: React.SyntheticEvent) => {
      ev.preventDefault();
      setIsSaving(true);

      try {
        await webhookSubscriptions.create({
          name,
        });
        showToast(
          t("Webhook subscription created", {
            type: "success",
          })
        );
        onSubmit();
      } catch (err) {
        showToast(err.message, {
          type: "error",
        });
      } finally {
        setIsSaving(false);
      }
    },
    [t, showToast, name, onSubmit, webhookSubscriptions]
  );

  const handleNameChange = React.useCallback((event) => {
    setName(event.target.value);
  }, []);

  return (
    <form onSubmit={handleSubmit}>
      <Text type="secondary">
        <Trans>Select the events you need and name this webhook</Trans>
      </Text>
      <Flex>
        <Input
          type="text"
          label="Name"
          onChange={handleNameChange}
          value={name}
          required
          autoFocus
          flex
        />
      </Flex>
      <Button type="submit" disabled={isSaving || !name}>
        {isSaving ? "Creating…" : "Create"}
      </Button>
    </form>
  );
}

export default WebhookSubscriptionNew;
