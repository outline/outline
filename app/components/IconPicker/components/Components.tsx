import styled from "styled-components";
import InputSearch from "~/components/InputSearch";
import { HStack } from "~/components/primitives/HStack";

export const UserInputContainer = styled(HStack)`
  height: 48px;
  padding: 6px 12px 0px;
`;

export const StyledInputSearch = styled(InputSearch)`
  flex-grow: 1;
  min-width: 0;
`;
