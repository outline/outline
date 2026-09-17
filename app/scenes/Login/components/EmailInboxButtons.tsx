import { observer } from "mobx-react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { Inner } from "~/components/Button";
import ButtonLarge from "~/components/ButtonLarge";
import Flex from "~/components/Flex";
import { GmailIcon } from "~/components/Icons/GmailIcon";
import { OutlookIcon } from "~/components/Icons/OutlookIcon";
import { useEmailInboxLinks } from "~/hooks/useEmailInboxLinks";

interface EmailInboxButtonsProps {
  email: string;
}

/**
 * Shows links to find the sign-in email in Gmail or Outlook.
 *
 * @param props the recipient email address.
 * @returns the available inbox buttons.
 */
export const EmailInboxButtons = observer(function EmailInboxButtons({
  email,
}: EmailInboxButtonsProps) {
  const { t } = useTranslation();
  const links = useEmailInboxLinks(email);

  return (
    <Buttons column gap={12}>
      {links.map(({ provider, href }) => (
        <ButtonLarge
          key={provider}
          forwardedAs="a"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          icon={provider === "gmail" ? <GmailIcon /> : <OutlookIcon />}
          fullwidth
          neutral
        >
          {provider === "gmail" ? t("Open in Gmail") : t("Open in Outlook")}
        </ButtonLarge>
      ))}
    </Buttons>
  );
});

const Buttons = styled(Flex)`
  width: 100%;
  margin-bottom: 12px;

  ${Inner} {
    height: 100%;
  }
`;
