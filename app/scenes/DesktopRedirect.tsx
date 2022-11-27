import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import Flex from "~/components/Flex";
import Heading from "~/components/Heading";
import PageTitle from "~/components/PageTitle";
import Text from "~/components/Text";
import useQuery from "~/hooks/useQuery";

const DesktopRedirect = () => {
  const params = useQuery();
  const url = params.get("url");
  const { t } = useTranslation();

  React.useEffect(() => {
    if (url) {
      window.location.href = url.replace("http:", "outline:");
    }
  }, [url]);

  return (
    <Centered align="center" justify="center" column auto>
      <PageTitle title={`${t("Signing in")}…`} />
      <Heading centered>{t("Signing in")}…</Heading>
      <Note>
        {t(
          "You can safely close this window once the Outline desktop app has started"
        )}
        .
      </Note>
    </Centered>
  );
};

const Note = styled(Text)`
  color: ${(props) => props.theme.textTertiary};
  text-align: center;
  font-size: 14px;
  margin-top: 8px;

  em {
    font-style: normal;
    font-weight: 500;
  }
`;

const Centered = styled(Flex)`
  user-select: none;
  width: 90vw;
  height: 100%;
  max-width: 320px;
  margin: 0 auto;
`;

export default DesktopRedirect;
