import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import Heading from "~/components/Heading";
import PageTitle from "~/components/PageTitle";
import Text from "~/components/Text";

/**
 * Renders the "Signing in…" screen shown while a login is being completed in
 * the background, for example after handing a session back to the desktop app
 * or while a passkey ceremony runs automatically.
 *
 * @returns the signing-in screen.
 */
export function SigningIn() {
  const { t } = useTranslation();

  return (
    <>
      <PageTitle title={`${t("Signing in")}…`} />
      <Heading centered>{t("Signing in")}…</Heading>
      <Note>
        {t(
          "You can safely close this window once the Outline desktop app has opened"
        )}
        .
      </Note>
    </>
  );
}

const Note = styled(Text)`
  color: ${s("textTertiary")};
  text-align: center;
  font-size: 14px;
  margin-top: 8px;

  em {
    font-style: normal;
    font-weight: 500;
  }
`;
