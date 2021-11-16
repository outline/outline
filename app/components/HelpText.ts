import styled from "styled-components";

const HelpText = styled.p<{ small?: boolean }>`
  margin-top: 0;
  color: ${(props) => props.theme.textSecondary};
  font-size: ${(props) => (props.small ? "13px" : "inherit")};
`;

export default HelpText;
