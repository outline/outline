import * as React from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { s, ellipsis } from "@shared/styles";
import { ConfigItem } from "~/hooks/useSettingsConfig";
import Flex from "./Flex";

type Props = {
  integration: ConfigItem;
};

function IntegrationCard({ integration }: Props) {
  const actionText = integration.isActive ? "Configure" : "Install";
  return (
    <Card tabIndex={0}>
      <Flex align="center" gap={20}>
        <integration.icon size={50} />
        <Name>{integration.name}</Name>
      </Flex>

      <Content>
        <Description>{integration.description}</Description>
      </Content>

      <Footer>
        <Status isActive={integration.isActive || false}>
          {integration.isActive ? "Active" : "Not Active"}
        </Status>
        <ActionLink
          to={integration.path}
          onClick={(e) => {
            if (!integration.isActive) {
              e.preventDefault();
            }
            // Otherwise let the <Link> navigate to the configure route
          }}
        >
          {actionText}
        </ActionLink>
      </Footer>
    </Card>
  );
}

export default IntegrationCard;

// — styled-components — //

const Card = styled.div`
  display: flex;
  flex-direction: column;
  padding: 12px;
  width: 100%;
  height: auto;
  background: ${s("background")};
  border: 1px solid ${s("inputBorder")};
  border-radius: 8px;
  transition: box-shadow 200ms ease;
  cursor: default;
`;

const Content = styled.div`
  flex: 1;
  min-width: 0;
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
  justify-content: space-between;
  margin-top: 16px;
`;

const Status = styled.span<{ isActive: boolean }>`
  font-size: 12px;
  color: ${(props) =>
    props.isActive ? props.theme.success : props.theme.danger};
`;

const ActionLink = styled(Link)`
  display: inline-block;
  padding: 4px 8px;
  font-size: 14px;
  background: ${s("brand")};
  color: ${s("white")};
  border-radius: 4px;
  text-decoration: none;
  text-align: center;
  transition: background 150ms ease;
`;
