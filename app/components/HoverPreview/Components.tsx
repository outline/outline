import * as React from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { s } from "@shared/styles";
import Text from "~/components/Text";

const StyledText = styled(Text)`
  margin-bottom: 0;
  padding-top: 0.125em;
`;

export const Preview = styled(Link)`
  cursor: var(--pointer);
  margin-bottom: 0;
  ${(props) => (!props.to ? "pointer-events: none;" : "")}
`;

export const Title = styled.h2`
  font-size: 1.25em;
  margin: 0.125em 0 0 0;
  color: ${s("text")};
`;

export const Info: React.FC = ({ children }) => (
  <StyledText type="tertiary" size="xsmall">
    {children}
  </StyledText>
);

export const Description: React.FC = styled(StyledText)`
  margin-top: 0.5em;
`;

export const DescriptionContainer = styled.div`
  margin-top: 0.5em;
`;
