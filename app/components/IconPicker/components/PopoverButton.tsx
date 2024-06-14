import styled from "styled-components";
import NudeButton from "~/components/NudeButton";
import { hover } from "~/styles";

export const PopoverButton = styled(NudeButton)`
  &: ${hover},
  &:active,
  &[aria-expanded= "true"] {
    opacity: 1 !important;
  }
`;
