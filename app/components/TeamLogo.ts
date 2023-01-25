import styled from "styled-components";
import Avatar from "./Avatar";

const TeamLogo = styled(Avatar)`
  border-radius: 4px;
  border: 1px solid ${(props) => props.theme.divider};
`;

export default TeamLogo;
