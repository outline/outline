import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { s, ellipsis } from "@shared/styles";
import { ConfigItem } from "~/hooks/useSettingsConfig";
import Button from "./Button";
import Flex from "./Flex";
import Text from "./Text";

type Props = {
  integration: ConfigItem;
};

function IntegrationCard({ integration }: Props) {
  const { t } = useTranslation();
  return (
    <Card>
      <Flex align="center" gap={8}>
        <integration.icon size={48} />
        <Flex auto column>
          <Name>{integration.name}</Name>
          {integration.isActive && <Status>{t("Connected")}</Status>}
        </Flex>
        <Button as={Link} to={integration.path} neutral>
          {integration.isActive ? t("Configure") : t("Install")}
        </Button>
      </Flex>

      <Description>{integration.description}</Description>
    </Card>
  );
}

export default IntegrationCard;

const Card = styled.div`
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  padding: 20px;
  width: 300px;
  background: ${s("background")};
  border: 1px solid ${s("inputBorder")};
  border-radius: 8px;
  transition: box-shadow 200ms ease;
`;

const Name = styled(Text)`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: ${s("text")};
  ${ellipsis()}
`;

const Description = styled(Text)`
  margin: 8px 0 0;
  font-size: 15px;
  max-width: 100%;
  color: ${s("textTertiary")};
`;

const Status = styled(Text).attrs({
  type: "secondary",
  size: "small",
  as: "span",
})`
  display: inline-flex;
  align-items: center;

  &::after {
    content: "";
    display: inline-block;
    width: 17px;
    height: 17px;

    background: radial-gradient(
      circle at center,
      ${s("accent")} 0 33%,
      transparent 33%
    );
    border-radius: 50%;
  }
`;
