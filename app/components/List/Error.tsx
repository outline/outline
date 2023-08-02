import { DisconnectedIcon, WarningIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import Empty from "~/components/Empty";
import useEventListener from "~/hooks/useEventListener";
import { OfflineError } from "~/utils/errors";
import ButtonLink from "../ButtonLink";
import Flex from "../Flex";

type Props = {
  error: Error;
  retry: () => void;
};

export default function LoadingError({ error, retry, ...rest }: Props) {
  const { t } = useTranslation();
  useEventListener("online", retry);

  const message =
    error instanceof OfflineError ? (
      <>
        <DisconnectedIcon /> {t("You’re offline.")}
      </>
    ) : (
      <>
        <WarningIcon /> {t("Sorry, an error occurred.")}
      </>
    );

  return (
    <Content {...rest}>
      <Flex align="center" gap={4} wrap>
        {message}{" "}
        <ButtonLink onClick={() => retry()}>{t("Click to retry")}…</ButtonLink>
      </Flex>
    </Content>
  );
}

const Content = styled(Empty)`
  padding: 8px 0;
  white-space: nowrap;

  ${ButtonLink} {
    color: ${s("textTertiary")};

    &:hover {
      color: ${s("textSecondary")};
      text-decoration: underline;
    }
  }
`;
