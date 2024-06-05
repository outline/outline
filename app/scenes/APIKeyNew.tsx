import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ApiKeyValidation } from "@shared/validations";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Input from "~/components/Input";
import Text from "~/components/Text";
import useStores from "~/hooks/useStores";

type Props = {
  onSubmit: () => void;
};

function APIKeyNew({ onSubmit }: Props) {
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
        toast.success(t("API Key created"));
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
      <Text as="p" type="secondary">
        {t(
          `Name your key something that will help you to remember it's use in the future, for example "local development" or "continuous integration".`
        )}
      </Text>
      <Flex>
        <Input
          type="text"
          label={t("Name")}
          onChange={handleNameChange}
          value={name}
          minLength={ApiKeyValidation.minNameLength}
          maxLength={ApiKeyValidation.maxNameLength}
          required
          autoFocus
          flex
        />
      </Flex>
      <Flex justify="flex-end">
        <Button type="submit" disabled={isSaving || !name}>
          {isSaving ? `${t("Creating")}…` : t("Create")}
        </Button>
      </Flex>
    </form>
  );
}

export default APIKeyNew;
