import styled from "styled-components";
import { s } from "@shared/styles";

const Separator = styled.div`
  height: 36px;
  width: 1px;
  background: ${s("textTertiary")};
  opacity: 0.25;
  display: inline-block;
  margin: -6px 2px;
`;

export default Separator;
