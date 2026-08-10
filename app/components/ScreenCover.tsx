import { useState } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Input from "~/components/Input";
import Text from "~/components/Text";

/** Where the cover remembers it is down, and what lifts it. */
const COVER_KEY = "shop_screen_cover";
const PIN_KEY = "shop_screen_pin";

/**
 * Whether the screen is currently covered.
 *
 * @returns true when the cover is down.
 */
export function isCovered(): boolean {
  return localStorage.getItem(COVER_KEY) === "1";
}

/** Puts the cover down over the screen. */
export function coverScreen(pin: string) {
  localStorage.setItem(PIN_KEY, pin);
  localStorage.setItem(COVER_KEY, "1");
}

const Backdrop = styled(Flex)`
  position: fixed;
  inset: 0;
  z-index: 1000;
  align-items: center;
  justify-content: center;
  background: ${s("background")};
`;

const Panel = styled(Flex)`
  flex-direction: column;
  gap: 12px;
  max-width: 320px;
  padding: 24px;
  text-align: center;
`;

interface Props {
  onLifted: () => void;
}

/**
 * A cover over the till screen while nobody is at it.
 *
 * This is a convenience, not a security measure, and it is written that way
 * on the screen. The mock runs entirely in the browser, so the number is kept
 * in localStorage where anyone at the machine can read or clear it – it stops
 * a passer-by glancing at the till, nothing more.
 *
 * @returns the rendered cover.
 */
export function ScreenCover({ onLifted }: Props) {
  const { t } = useTranslation();
  const [entered, setEntered] = useState("");
  const [wrong, setWrong] = useState(false);

  // A form, so that pressing Enter lifts the cover. Input's own
  // `onRequestSubmit` wants CMD+Enter, which suits a textarea but not a
  // four-digit number somebody is typing to get back to the till.
  const lift = (event: React.FormEvent) => {
    event.preventDefault();
    if (entered === localStorage.getItem(PIN_KEY)) {
      localStorage.removeItem(COVER_KEY);
      onLifted();
      return;
    }
    setWrong(true);
    setEntered("");
  };

  return (
    <Backdrop>
      <Panel as="form" onSubmit={lift}>
        <Text as="p" weight="bold">
          {t("Screen covered")}
        </Text>
        <Input
          type="password"
          label={t("Number")}
          value={entered}
          onChange={(event) => {
            setEntered(event.target.value);
            setWrong(false);
          }}
          autoFocus
          short
        />
        {wrong ? (
          <Text as="p" type="danger" size="small" data-testid="cover-wrong">
            {t("That is not the number.")}
          </Text>
        ) : null}
        <Button type="submit">{t("Uncover")}</Button>
        <Text as="p" type="tertiary" size="xsmall">
          {t(
            "This hides the screen from passers-by. It is not a lock and protects nothing — anyone at this computer can lift it."
          )}
        </Text>
      </Panel>
    </Backdrop>
  );
}
