import { transparentize } from "polished";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { s } from "@shared/styles";

/**
 * A sticky container for action buttons such as "Save" on settings screens.
 */
export const ActionRow = styled.div`
  position: sticky;
  bottom: 0;
  width: 100vw;
  padding: 16px 12px;
  margin-left: -12px;

  background: ${s("background")};

  @supports (backdrop-filter: blur(20px)) {
    backdrop-filter: blur(20px);
    background: ${(props) => transparentize(0.2, props.theme.background)};
  }

  ${breakpoint("tablet")`
    width: auto;
  `}
`;
