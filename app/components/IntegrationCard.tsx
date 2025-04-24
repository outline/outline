import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { s, ellipsis } from "@shared/styles";
import { ConfigItem } from "~/hooks/useSettingsConfig";
import Button from "./Button";
import Flex from "./Flex";

type Props = {
  integration: ConfigItem;
};

function IntegrationCard({ integration }: Props) {
  const { t } = useTranslation();

  return (
    <Card>
      <Flex justify="space-between" align="center">
        <Flex align="center" gap={20}>
          <integration.icon size={50} />
          <Name>{integration.name}</Name>
        </Flex>

        <Status isActive={integration.isActive || false}>
          {integration.isActive ? t("Connected") : t("Not Connected")}
        </Status>
      </Flex>

      <Description>{integration.description}</Description>

      <Footer>
        <Button as={Link} to={integration.path}>
          {integration.isActive ? t("Configure") : t("Install")}
        </Button>
      </Footer>
    </Card>
  );
}

export default IntegrationCard;

const Card = styled.div`
  display: flex;
  flex-direction: column;
  padding: 20px;
  width: 100%;
  height: auto;
  background: ${s("background")};
  border: 1px solid ${s("inputBorder")};
  border-radius: 8px;
  transition: box-shadow 200ms ease;
  cursor: default;
`;

const Name = styled.h3`
  margin: 0;
  font-size: 16px;
  color: ${s("text")};
  ${ellipsis()}
`;

const Description = styled.p`
  margin: 4px 0 0;
  font-size: 14px;
  max-width: 100%;
  color: ${s("textTertiary")};
`;

const Footer = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-top: 16px;
`;

const Status = styled.span<{ isActive: boolean }>`
  font-size: 12px;
  margin-right: 8px;
  color: ${(props) =>
    props.isActive ? props.theme.success : props.theme.danger};
`;
