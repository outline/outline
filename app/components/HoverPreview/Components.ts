import { Link } from "react-router-dom";
import styled from "styled-components";
import { s } from "@shared/styles";
import Text from "~/components/Text";

export const Preview = styled(Link)`
  cursor: var(--pointer);
  margin-bottom: 0;
  ${(props) => (!props.to ? "pointer-events: none;" : "")}
`;

export const Title = styled.h2`
  font-size: 1.25em;
  margin: 2px 0 0 0;
  color: ${s("text")};
`;

export const Description = styled(Text)`
  margin-bottom: 0;
  padding-top: 2px;
`;

export const Summary = styled.div`
  margin-top: 8px;
`;
