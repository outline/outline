import styled from "styled-components";
import { s } from "@shared/styles";

const Divider = styled.hr`
  border: 0;
  border-bottom: 1px solid ${s("divider")};
  margin: 0;
  padding: 0;
`;

export default Divider;
