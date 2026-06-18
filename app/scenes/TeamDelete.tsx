import { observer } from "mobx-react";
import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation, Trans } from "react-i18next";
import { toast } from "sonner";
import { errToString } from "@shared/utils/error";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import { OneTimePasswordInput } from "~/components/OneTimePasswordInput";
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
    control,
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
        toast.error(errToString(error));
      }
    },
    [auth]
  );

  const handleSubmit = React.useCallback(
    async (data: FormData) => {
      try {
        await auth.deleteTeam(data);
        await auth.logout({
          savePath: false,
          revokeToken: false,
          userInitiated: true,
          clearCache: true,
        });
        onSubmit();
      } catch (error) {
        toast.error(errToString(error));
      }
    },
    [auth, onSubmit]
  );

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
          <Controller
            control={control}
            name="code"
            rules={{
              required: env.EMAIL_ENABLED,
              minLength: 8,
            }}
            render={({ field }) => (
              <OneTimePasswordInput
                length={8}
                alphanumeric
                autoComplete="off"
                autoFocus
                name={field.name}
                value={field.value ?? ""}
                onValueChange={field.onChange}
                onBlur={field.onBlur}
                ref={field.ref}
                style={{ marginBottom: "1em" }}
              />
            )}
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
