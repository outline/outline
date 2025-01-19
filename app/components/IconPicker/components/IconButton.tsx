import styled from "styled-components";
import { s, hover } from "@shared/styles";
import NudeButton from "~/components/NudeButton";

export const IconButton = styled(NudeButton)<{ delay?: number }>`
  width: 32px;
  height: 32px;
  padding: 4px;

  &: ${hover} {
    background: ${s("listItemHoverBackground")};
  }
`;
