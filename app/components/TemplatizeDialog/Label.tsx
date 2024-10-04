import React from "react";
import styled from "styled-components";
import Flex from "~/components/Flex";

const Label = ({ icon, value }: { icon: React.ReactNode; value: string }) => (
  <Flex align="center" gap={4}>
    <IconWrapper>{icon}</IconWrapper>
    {value}
  </Flex>
);

const IconWrapper = styled.span`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 24px;
  width: 24px;
  overflow: hidden;
  flex-shrink: 0;
`;

export default Label;
