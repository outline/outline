import { observer } from "mobx-react";
import * as React from "react";
import { useForm } from "react-hook-form";
import { useTranslation, Trans } from "react-i18next";
import { toast } from "sonner";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Input from "~/components/Input";
import Text from "~/components/Text";
import env from "~/env";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useStores from "~/hooks/useStores";

type FormData = {
  code: string;
};

type Props = {
  onSubmit: () => void;
};

function TeamDelete({ onSubmit }: Props) {
  const [isWaitingCode, setWaitingCode] = React.useState(false);
  const { auth } = useStores();
  const team = useCurrentTeam({ rejectOnEmpty: false });
  const { t } = useTranslation();
  const {
    register,
    handleSubmit: formHandleSubmit,
    formState,
  } = useForm<FormData>();

  const handleRequestDelete = React.useCallback(
    async (ev: React.SyntheticEvent) => {
      ev.preventDefault();

      try {
        await auth.requestDeleteTeam();
        setWaitingCode(true);
      } catch (error) {
        toast.error(error.message);
      }
    },
    [auth]
  );

  const handleSubmit = React.useCallback(
    async (data: FormData) => {
      try {
        await auth.deleteTeam(data);
        await auth.logout();
        onSubmit();
      } catch (error) {
        toast.error(error.message);
      }
    },
    [auth, onSubmit]
  );

  const inputProps = register("code", {
    required: env.EMAIL_ENABLED,
  });
  const appName = env.APP_NAME;
  const workspaceName = team?.name;

  return (
    <form onSubmit={formHandleSubmit(handleSubmit)}>
      {isWaitingCode ? (
        <>
          <Text as="p" type="secondary">
            <Trans>
              A confirmation code has been sent to your email address, please
              enter the code below to permanently destroy this workspace.
            </Trans>
          </Text>
          <Input
            placeholder={t("Confirmation code")}
            autoComplete="off"
            autoFocus
            maxLength={8}
            required
            {...inputProps}
          />
        </>
      ) : (
        <>
          <Text as="p" type="secondary">
            <Trans>
              Deleting the <strong>{{ workspaceName }}</strong> workspace will
              destroy all collections, documents, users, and associated data.
              You will be immediately logged out of {{ appName }}.
            </Trans>
          </Text>
        </>
      )}

      <Flex justify="flex-end">
        {env.EMAIL_ENABLED && !isWaitingCode ? (
          <Button type="submit" onClick={handleRequestDelete} neutral>
            {t("Continue")}…
          </Button>
        ) : (
          <Button
            type="submit"
            disabled={formState.isSubmitting || !formState.isValid}
            danger
          >
            {formState.isSubmitting
              ? `${t("Deleting")}…`
              : t("Delete workspace")}
          </Button>
        )}
      </Flex>
    </form>
  );
}

export default observer(TeamDelete);
