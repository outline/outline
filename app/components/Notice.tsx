import React from "react";
import styled from "styled-components";
import Flex from "./Flex";

type NoticeProps = {
  children: React.ReactNode;
  icon?: JSX.Element;
  description?: JSX.Element;
};

const Notice = ({ children, icon, description }: NoticeProps) => {
  return (
    <Container>
      <Flex as="span" gap={4}>
        {icon}
        <span>{children}</span>
      </Flex>
      {description}
    </Container>
  );
};

const Container = styled.p`
  background: ${(props) => props.theme.sidebarBackground};
  color: ${(props) => props.theme.sidebarText};
  padding: 10px 12px;
  border-radius: 4px;
  position: relative;
`;

export default Notice;
