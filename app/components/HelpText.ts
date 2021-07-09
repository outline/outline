import styled from "styled-components";

type Props = {
  small?: boolean;
};

const HelpText = styled.p<Props>`
  margin-top: 0;
  color: ${(props) => props.theme.textSecondary};
  font-size: ${(props) => (props.small ? "13px" : "inherit")};
`;

export default HelpText;
