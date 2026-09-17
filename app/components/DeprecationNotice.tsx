import styled from "styled-components";
import { s } from "@shared/styles";
import Notice from "./Notice";

/** A deprecation notice with a focus border around its editable reason. */
export const DeprecationNotice = styled(Notice)`
  &:focus-within {
    outline: 1px solid ${s("inputBorderFocused")};
  }

  > span > span {
    flex: 1;
    min-width: 0;
  }
`;
