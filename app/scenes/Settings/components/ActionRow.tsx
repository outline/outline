import { transparentize } from "polished";
import styled from "styled-components";
import { s } from "@shared/styles";

/**
 * A sticky container for action buttons such as "Save" on settings screens.
 */
export const ActionRow = styled.div`
  position: sticky;
  bottom: 0;
  padding: 16px 50vw;
  margin: 0 -50vw;

  background: ${s("background")};

  @supports (backdrop-filter: blur(20px)) {
    backdrop-filter: blur(20px);
    background: ${(props) => transparentize(0.2, props.theme.background)};
  }
`;
