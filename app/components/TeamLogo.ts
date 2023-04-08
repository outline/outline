import styled from "styled-components";
import { s } from "@shared/styles";
import Avatar from "./Avatar";

const TeamLogo = styled(Avatar)`
  border-radius: 4px;
  border: 1px solid ${s("divider")};
`;

export default TeamLogo;
