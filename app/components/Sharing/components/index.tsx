import { darken } from "polished";
import styled from "styled-components";
import { s } from "@shared/styles";
import NudeButton from "~/components/NudeButton";
import { hover } from "~/styles";

// TODO: Temp until Button/NudeButton styles are normalized
export const Wrapper = styled.div`
  ${NudeButton}:${hover},
  ${NudeButton}[aria-expanded="true"] {
    background: ${(props) => darken(0.05, props.theme.buttonNeutralBackground)};
  }
`;

export const Separator = styled.div`
  border-top: 1px dashed ${s("divider")};
  margin: 12px 0;
`;
