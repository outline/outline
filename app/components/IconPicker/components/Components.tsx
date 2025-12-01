import Flex from "@shared/components/Flex";
import styled from "styled-components";
import InputSearch from "~/components/InputSearch";

export const UserInputContainer = styled(Flex)`
  height: 48px;
  padding: 6px 12px 0px;
`;

export const StyledInputSearch = styled(InputSearch)`
  flex-grow: 1;
`;
