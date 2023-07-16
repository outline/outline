import styled from "styled-components";
import { s } from "@shared/styles";

const Separator = styled.div`
  height: 24px;
  width: 1px;
  background: ${s("textTertiary")};
  opacity: 0.5;
  display: inline-block;
  margin: 0 2px;
`;

export default Separator;
