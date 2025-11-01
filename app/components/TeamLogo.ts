import styled from "styled-components";
import { Avatar } from "./Avatar";
import { AvatarVariant } from "./Avatar/Avatar";

const TeamLogo = styled(Avatar).attrs({
  variant: AvatarVariant.Square,
})`
  border-radius: 4px;
  border: 0;
`;

export default TeamLogo;
