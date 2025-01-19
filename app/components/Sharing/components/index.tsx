import { darken } from "polished";
import styled from "styled-components";
import Flex from "@shared/components/Flex";
import { s, hover } from "@shared/styles";
import NudeButton from "~/components/NudeButton";

// TODO: Temp until Button/NudeButton styles are normalized
export const Wrapper = styled.div`
  ${NudeButton}:${hover},
  ${NudeButton}[aria-expanded="true"] {
    background: ${(props) => darken(0.05, props.theme.buttonNeutralBackground)};
  }
`;

export const Separator = styled.div`
  border-top: 1px dashed ${s("divider")};
  margin: 8px 0;
`;

export const HeaderInput = styled(Flex)`
  position: sticky;
  z-index: 1;
  top: 0;
  background: ${s("menuBackground")};
  color: ${s("textTertiary")};
  border-bottom: 1px solid ${s("inputBorder")};
  padding: 0 24px 12px;
  margin-top: 0;
  margin-left: -24px;
  margin-right: -24px;
  margin-bottom: 12px;
  cursor: text;

  &:before {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    top: -20px;
    height: 20px;
    background: ${s("menuBackground")};
  }
`;

export const presence = {
  initial: {
    opacity: 0,
    width: 0,
    marginRight: 0,
  },
  animate: {
    opacity: 1,
    width: "auto",
    marginRight: 8,
    transition: {
      type: "spring",
      duration: 0.2,
      bounce: 0,
    },
  },
  exit: {
    opacity: 0,
    width: 0,
    marginRight: 0,
  },
};
