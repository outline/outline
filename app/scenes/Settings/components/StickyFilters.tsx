import styled from "styled-components";
import { depths, s } from "@shared/styles";
import Flex from "~/components/Flex";
import { HEADER_HEIGHT } from "~/components/Header";

export const FILTER_HEIGHT = 40;

export const StickyFilters = styled(Flex)`
  height: ${FILTER_HEIGHT}px;
  position: sticky;
  top: ${HEADER_HEIGHT}px;
  z-index: ${depths.header};
  background: ${s("background")};
`;
