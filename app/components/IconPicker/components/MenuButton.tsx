import { hover, s } from "@shared/styles";
import styled from "styled-components";
import NudeButton from "~/components/NudeButton";

export const MenuButton = styled(NudeButton)`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  color: ${s("textSecondary")};
  border: 1px solid ${s("inputBorder")};
  padding: 4px;

  &: ${hover} {
    border: 1px solid ${s("inputBorderFocused")};
  }
`;
