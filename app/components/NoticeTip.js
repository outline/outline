// @flow
import styled from "styled-components";

const Notice = styled.p`
  background: ${(props) => props.theme.brand.marine};
  color: ${(props) => props.theme.almostBlack};
  padding: 10px 12px;
  margin-top: 24px;
  border-radius: 4px;
  position: relative;

  a {
    color: ${(props) => props.theme.almostBlack};
    font-weight: 500;
  }

  a:hover {
    text-decoration: underline;
  }
`;

export default Notice;
