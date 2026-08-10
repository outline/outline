import { useState } from "react";
import { useTranslation } from "react-i18next";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Input from "~/components/Input";
import Text from "~/components/Text";
import { coverScreen } from "~/components/ScreenCover";
import useStores from "~/hooks/useStores";

interface Props {
  /** Called once the cover is down. */
  onCovered: () => void;
}

/**
 * Asks for the number that will lift the screen cover.
 *
 * This replaces a `window.prompt`, which blocks the whole browser and cannot
 * mask what is typed – awkward when the point of the number is that a
 * passer-by should not read it off the till.
 *
 * Built as a plain form rather than on `ConfirmationDialog`: that component
 * wraps its children in a `Text`, which renders a span, so a field would be
 * block content inside phrasing content.
 *
 * @returns the rendered dialog.
 */
export function CoverScreenDialog({ onCovered }: Props) {
  const { t } = useTranslation();
  const { dialogs } = useStores();
  const [pin, setPin] = useState("");

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    coverScreen(pin);
    dialogs.closeAllModals();
    onCovered();
  };

  return (
    <form onSubmit={handleSubmit}>
      <Text as="p" type="secondary">
        {t(
          "This hides the screen from passers-by. It is not a lock and protects nothing — anyone at this computer can lift it."
        )}
      </Text>
      <Flex column>
        <Input
          type="password"
          label={t("Number")}
          value={pin}
          onChange={(event) => setPin(event.target.value)}
          autoFocus
          flex
        />
      </Flex>
      <Button type="submit" disabled={!pin}>
        {t("Cover screen")}
      </Button>
    </form>
  );
}
