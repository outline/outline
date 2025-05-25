import styled from "styled-components";
import { s } from "@shared/styles";
import { Avatar } from "./Avatar";
import { AvatarVariant } from "./Avatar/Avatar";

const TeamLogo = styled(Avatar).attrs({
  variant: AvatarVariant.Square,
})`
  border-radius: 4px;
  border: 0;
  position: relative;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: 4px;
    box-shadow: inset 0 0 0 1px ${s("divider")};
    z-index: -1;
  }
`;

export default TeamLogo;
