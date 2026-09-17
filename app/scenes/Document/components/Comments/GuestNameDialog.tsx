import * as React from "react";
import { useTranslation } from "react-i18next";
import { CommentValidation } from "@shared/validations";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Input from "~/components/Input";
import Text from "~/components/Text";
import env from "~/env";
import useStores from "~/hooks/useStores";

type Props = {
  /** The name to prefill the input with. */
  defaultValue?: string;
  /** The email address to prefill the input with, if previously supplied. */
  defaultEmail?: string;
  /** Callback with the trimmed name, and optional email, once submitted. */
  onSubmit: (name: string, email?: string) => void;
};

/**
 * Asks a visitor of a public share for the name their comments are published
 * under, and optionally an email address to be notified of replies. Both are
 * remembered locally, so this is only shown the first time they comment, or
 * when they choose to change either.
 */
export function GuestNameDialog({
  defaultValue = "",
  defaultEmail = "",
  onSubmit,
}: Props) {
  const { t } = useTranslation();
  const { dialogs } = useStores();
  const [name, setName] = React.useState(defaultValue);
  const [email, setEmail] = React.useState(defaultEmail);

  const handleChangeName = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => setName(event.target.value),
    []
  );

  const handleChangeEmail = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) =>
      setEmail(event.target.value),
    []
  );

  const handleSubmit = React.useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();

      const trimmed = name.trim();
      if (!trimmed) {
        return;
      }

      onSubmit(trimmed, email.trim() || undefined);
      dialogs.closeAllModals();
    },
    [name, email, onSubmit, dialogs]
  );

  return (
    <form onSubmit={handleSubmit}>
      <Flex gap={12} column>
        <Text type="secondary">
          {t("This is the name that will be shown alongside your comments.")}
        </Text>
        <Input
          value={name}
          onChange={handleChangeName}
          label={t("Your name")}
          maxLength={CommentValidation.maxGuestNameLength}
          autoComplete="name"
          autoFocus
          required
          margin={0}
        />
        {env.EMAIL_ENABLED && (
          <>
            <Input
              type="email"
              value={email}
              onChange={handleChangeEmail}
              label={t("Your email (optional)")}
              autoComplete="email"
              margin={0}
            />
            <Text type="tertiary" size="small">
              {t(
                "We'll send a confirmation email and only use this to notify you of replies to your comments."
              )}
            </Text>
          </>
        )}
        <Flex justify="flex-end">
          <Button type="submit" disabled={!name.trim()}>
            {t("Continue")}
          </Button>
        </Flex>
      </Flex>
    </form>
  );
}
