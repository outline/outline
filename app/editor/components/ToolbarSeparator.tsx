import styled from "styled-components";
import { s } from "@shared/styles";

const Separator = styled.div`
  height: 24px;
  width: 2px;
  background: ${s("toolbarItem")};
  opacity: 0.3;
  display: inline-block;
  margin-left: 8px;
`;

export default Separator;
