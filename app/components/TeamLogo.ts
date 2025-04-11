import styled from "styled-components";
import { s } from "@shared/styles";
import { Avatar } from "./Avatar";
import { AvatarVariant } from "./Avatar/Avatar";

const TeamLogo = styled(Avatar).attrs({
  variant: AvatarVariant.Square,
})`
  border-radius: 4px;
  box-shadow: inset 0 0 0 1px ${s("divider")};
  border: 0;
`;

export default TeamLogo;
