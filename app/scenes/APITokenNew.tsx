import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Input from "~/components/Input";
import Text from "~/components/Text";
import useStores from "~/hooks/useStores";

type Props = {
  onSubmit: () => void;
};

function APITokenNew({ onSubmit }: Props) {
  const [name, setName] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);
  const { apiKeys } = useStores();
  const { t } = useTranslation();

  const handleSubmit = React.useCallback(
    async (ev: React.SyntheticEvent) => {
      ev.preventDefault();
      setIsSaving(true);

      try {
        await apiKeys.create({
          name,
        });
        toast.success(t("API token created"));
        onSubmit();
      } catch (err) {
        toast.error(err.message);
      } finally {
        setIsSaving(false);
      }
    },
    [t, name, onSubmit, apiKeys]
  );

  const handleNameChange = React.useCallback((event) => {
    setName(event.target.value);
  }, []);

  return (
    <form onSubmit={handleSubmit}>
      <Text type="secondary">
        {t(
          `Name your token something that will help you to remember it's use in the future, for example "local development", "production", or "continuous integration".`
        )}
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

export default APITokenNew;
