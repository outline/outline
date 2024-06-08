import React from "react";
import styled from "styled-components";
import { s } from "@shared/styles";
import Flex from "./Flex";
import Text from "./Text";

type Props = {
  children?: React.ReactNode;
  icon?: JSX.Element;
  description?: JSX.Element;
};

const Notice: React.FC<Props> = ({ children, icon, description }: Props) => (
  <Container as="div">
    <Flex as="span" gap={8}>
      {icon}
      <span>
        <Title>{children}</Title>
        {description && (
          <>
            <br />
            {description}
          </>
        )}
      </span>
    </Flex>
  </Container>
);

const Title = styled.span`
  font-weight: 500;
  font-size: 16px;
`;

const Container = styled(Text)`
  background: ${s("sidebarBackground")};
  color: ${s("sidebarText")};
  padding: 10px 12px;
  border-radius: 4px;
  position: relative;
  font-size: 14px;
  margin: 1em 0 0;

  svg {
    flex-shrink: 0;
  }
`;

export default Notice;
