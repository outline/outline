import * as React from "react";
import { useForm } from "react-hook-form";
import { useTranslation, Trans } from "react-i18next";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import { ReactHookWrappedInput } from "~/components/Input";
import Text from "~/components/Text";
import useStores from "~/hooks/useStores";
import useToasts from "~/hooks/useToasts";

type Props = {
  onSubmit: () => void;
};

interface FormData {
  name: string;
}

function WebhookSubscriptionNew({ onSubmit }: Props) {
  const { webhookSubscriptions } = useStores();
  const { showToast } = useToasts();
  const { t } = useTranslation();
  const { register, handleSubmit: formHandleSubmit, formState } = useForm<
    FormData
  >({ mode: "onChange" });

  const handleSubmit = React.useCallback(
    async (data: FormData) => {
      try {
        await webhookSubscriptions.create({
          name: data.name,
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
      }
    },
    [t, showToast, onSubmit, webhookSubscriptions]
  );

  return (
    <form onSubmit={formHandleSubmit(handleSubmit)}>
      <Text type="secondary">
        <Trans>Select the events you need and name this webhook</Trans>
      </Text>
      <Flex>
        <ReactHookWrappedInput
          required
          autoFocus
          flex
          {...register("name", { required: true })}
        />
      </Flex>
      <Button
        type="submit"
        disabled={formState.isSubmitting || !formState.isValid}
      >
        {formState.isSubmitting ? "Creating…" : "Create"}
      </Button>
    </form>
  );
}

export default WebhookSubscriptionNew;
