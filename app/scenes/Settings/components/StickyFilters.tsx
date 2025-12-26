import styled from "styled-components";
import { depths, s } from "@shared/styles";
import { HEADER_HEIGHT } from "~/components/Header";
import { HStack } from "~/components/primitives/HStack";

export const FILTER_HEIGHT = 40;

export const StickyFilters = styled(HStack)`
  height: ${FILTER_HEIGHT}px;
  position: sticky;
  top: ${HEADER_HEIGHT}px;
  z-index: ${depths.header};
  background: ${s("background")};
`;
