import styled from "styled-components";
import { s } from "@shared/styles";
import NudeButton from "~/components/NudeButton";
import { hover } from "~/styles";

export const IconButton = styled(NudeButton)<{ delay?: number }>`
  width: 32px;
  height: 32px;
  padding: 4px;

  &: ${hover} {
    background: ${s("listItemHoverBackground")};
  }
`;
