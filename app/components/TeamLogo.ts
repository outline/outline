import styled from "styled-components";
import Avatar from "./Avatar";

const TeamLogo = styled(Avatar)`
  border-radius: 4px;
  border: 1px solid ${(props) => props.theme.divider};
  overflow: hidden;
  flex-shrink: 0;
`;

export default TeamLogo;
