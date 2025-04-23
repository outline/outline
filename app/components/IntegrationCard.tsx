import * as React from "react";
import styled, { useTheme } from "styled-components";
import Icon from "@shared/components/Icon";
import Squircle from "@shared/components/Squircle";
import { s, hover, ellipsis } from "@shared/styles";
import Button from "~/components/ActionButton";

export type Integration = {
  id: string;
  name: string;
  icon?: string;
  description: string;
  isActive: boolean;
};

type Props = {
  integration: Integration;
  onInstall: (id: string) => void;
  onConfigure: (id: string) => void;
};

const IntegrationCard: React.FC<Props> = ({
  integration,
  onInstall,
  onConfigure,
}) => {
  const theme = useTheme();

  return (
    <Card>
      <IconWrapper>
        {integration.icon ? (
          <Squircle color={theme.slateLight}>
            <Icon value={integration.icon} size={24} />
          </Squircle>
        ) : (
          <Squircle color={theme.slateLight}>
            <Icon value="puzzle" size={24} />
          </Squircle>
        )}
      </IconWrapper>
      <Content>
        <Name>{integration.name}</Name>
        <Description>{integration.description}</Description>
      </Content>
      <Footer>
        <Status isActive={integration.isActive}>
          {integration.isActive ? "isActive" : "Not isActive"}
        </Status>
        {integration.isActive ? (
          <ActionButton onClick={() => onConfigure(integration.id)}>
            Configure
          </ActionButton>
        ) : (
          <ActionButton onClick={() => onInstall(integration.id)}>
            Install
          </ActionButton>
        )}
      </Footer>
    </Card>
  );
};

export default IntegrationCard;

const Card = styled.div`
  display: flex;
  flex-direction: column;
  padding: 12px;
  width: 200px;
  height: 220px;
  background: ${s("background")};
  border: 1px solid ${s("inputBorder")};
  border-radius: 8px;
  transition: box-shadow 200ms ease;
  cursor: pointer;

  &: ${hover} {
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  }
`;

const IconWrapper = styled.div`
  margin-bottom: 12px;
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
  color: ${s("textTertiary")};
  ${ellipsis()}
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

const ActionButton = styled(Button)`
  padding: 4px 8px;
  font-size: 14px;
`;
