import { observer } from "mobx-react";
import * as React from "react";
import { useForm } from "react-hook-form";
import { useTranslation, Trans } from "react-i18next";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Input from "~/components/Input";
import Text from "~/components/Text";
import env from "~/env";
import useStores from "~/hooks/useStores";
import useToasts from "~/hooks/useToasts";

type FormData = {
  code: string;
};

function UserDelete() {
  const [isWaitingCode, setWaitingCode] = React.useState(false);
  const { auth } = useStores();
  const { showToast } = useToasts();
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
        await auth.requestDelete();
        setWaitingCode(true);
      } catch (error) {
        showToast(error.message, {
          type: "error",
        });
      }
    },
    [auth, showToast]
  );

  const handleSubmit = React.useCallback(
    async (data: FormData) => {
      try {
        await auth.deleteUser(data);
        auth.logout();
      } catch (error) {
        showToast(error.message, {
          type: "error",
        });
      }
    },
    [auth, showToast]
  );

  const inputProps = register("code", {
    required: true,
  });
  const appName = env.APP_NAME;

  return (
    <Flex column>
      <form onSubmit={formHandleSubmit(handleSubmit)}>
        {isWaitingCode ? (
          <>
            <Text type="secondary">
              <Trans>
                A confirmation code has been sent to your email address, please
                enter the code below to permanantly destroy your account.
              </Trans>
            </Text>
            <Text type="secondary">
              <Trans
                defaults="<em>Note:</em> Signing back in will cause a new account to be automatically reprovisioned."
                components={{
                  em: <strong />,
                }}
              />
            </Text>
            <Input
              placeholder="CODE"
              autoComplete="off"
              autoFocus
              maxLength={8}
              required
              {...inputProps}
            />
          </>
        ) : (
          <>
            <Text type="secondary">
              <Trans>
                Are you sure? Deleting your account will destroy identifying
                data associated with your user and cannot be undone. You will be
                immediately logged out of {{ appName }} and all your API tokens
                will be revoked.
              </Trans>
            </Text>
          </>
        )}
        {env.EMAIL_ENABLED && !isWaitingCode ? (
          <Button type="submit" onClick={handleRequestDelete} neutral>
            {t("Continue")}…
          </Button>
        ) : (
          <Button type="submit" disabled={formState.isSubmitting} danger>
            {formState.isSubmitting
              ? `${t("Deleting")}…`
              : t("Delete My Account")}
          </Button>
        )}
      </form>
    </Flex>
  );
}

export default observer(UserDelete);
