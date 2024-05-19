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
import useStores from "~/hooks/useStores";

type FormData = {
  code: string;
};

type Props = {
  /** Callback to close the dialog when user deletion completes. */
  onSubmit: () => void;
};

function UserDelete({ onSubmit }: Props) {
  const [isWaitingCode, setWaitingCode] = React.useState(false);
  const { auth } = useStores();
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
        await auth.requestDeleteUser();
        setWaitingCode(true);
      } catch (err) {
        toast.error(err.message);
      }
    },
    [auth]
  );

  const handleSubmit = React.useCallback(
    async (data: FormData) => {
      try {
        await auth.deleteUser(data);
        await auth.logout();
        onSubmit();
      } catch (err) {
        toast.error(err.message);
      }
    },
    [auth, onSubmit]
  );

  const inputProps = register("code", {
    required: env.EMAIL_ENABLED,
  });
  const appName = env.APP_NAME;

  return (
    <form onSubmit={formHandleSubmit(handleSubmit)}>
      {isWaitingCode ? (
        <>
          <Text as="p" type="secondary">
            <Trans>
              A confirmation code has been sent to your email address, please
              enter the code below to permanently destroy your account.
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
              Are you sure? Deleting your account will destroy identifying data
              associated with your user and cannot be undone. You will be
              immediately logged out of {{ appName }} and all your API tokens
              will be revoked.
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
              : t("Delete my account")}
          </Button>
        )}
      </Flex>
    </form>
  );
}

export default observer(UserDelete);
